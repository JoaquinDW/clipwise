/**
 * The Momentreel engine: import, transcribe and render, all on this machine.
 *
 * This is the cloud workers' pipeline with the cloud taken out. Postgres,
 * Supabase Storage, Redis and the OpenAI calls are gone; what remains is
 * yt-dlp, whisper.cpp and FFmpeg driven from one process. Choosing *which*
 * moments become clips is not done here at all — that is the user's agent,
 * talking to us over MCP — so the engine has no model and no API key.
 *
 * Electron-free on purpose: the app's main process and the headless CLI both
 * construct it, and tests can too.
 */
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';

import type { TranscriptionResult, TranscriptionSegment } from '@/lib/ai/transcribe';
import { buildExpandedWindows, scoreWindows, SHORT_VIDEO_BYPASS_SECONDS } from '@/lib/ai/scoring';
import { setFaceDetectorFactory } from '@/lib/video/face-track';
import { createClipSmart, extractClip, generateThumbnail, getVideoMetadata, type RenderFallback } from '@/lib/video/processor';
import { downloadWithProgress, ytdlpArgs, ytdlpBinary, ytdlpEnv } from '@/lib/video/ytdlp';
import { resolveStyleName } from '@/lib/captions/presets';

import { resolveTool, type ResolvedTool, type ToolName } from './binaries';
import { buildCaptions, clipWords } from './captions';
import { validateClipRange, type ClipSpec } from './clip-spec';
import { createWasmFaceDetector } from './face-detector-wasm';
import { Lane } from './jobs';
import { Library } from './library';
import { SettingsStore, type Settings } from './settings';
import type { ClipRecord, VideoRecord, VideoSource } from './types';
import {
  WHISPER_MODELS,
  downloadModel,
  extractWhisperAudio,
  isModelInstalled,
  modelPath,
  transcribeLocal,
} from './whisper';

const execFileAsync = promisify(execFile);

export interface EngineConfig {
  /** App-private state: library index, settings, models, updatable binaries. */
  dataDir: string;
  /** Where videos and rendered clips are written, visible to the user. */
  libraryDir: string;
  /** Bundled binaries (`bin/<platform>-<arch>`) and caption fonts. */
  resourcesDir: string;
  /** Caption fonts. Defaults to `<resourcesDir>/fonts/captions`. */
  fontsDir?: string;
  /**
   * Value for yt-dlp's `--js-runtimes`, which YouTube's signature challenge
   * needs. The app passes its own Electron binary, run as node.
   */
  ytdlpJsRuntime?: string;
}

export interface EngineStatus {
  tools: Record<ToolName, ResolvedTool | null>;
  whisperModel: string;
  whisperModelInstalled: boolean;
  models: Array<{ id: string; label: string; sizeMb: number; installed: boolean }>;
  modelDownload: { id: string; progress: number } | null;
  /** Human-readable problems that stop imports from working. */
  problems: string[];
}

const TOOLS: ToolName[] = ['ffmpeg', 'ffprobe', 'yt-dlp', 'whisper-cli'];

/** Longest an MCP call may block waiting on a video, under typical client timeouts. */
export const MAX_WAIT_SECONDS = 50;

const YTDLP_UPDATE_INTERVAL_MS = 3 * 86_400_000;

export class Engine extends EventEmitter {
  readonly library: Library;
  readonly settings: SettingsStore;
  private tools = {} as Record<ToolName, ResolvedTool | null>;
  private readonly importLane = new Lane('import', 1);
  private readonly renderLane = new Lane('render', 2);
  private modelDownload: { id: string; progress: number } | null = null;

  constructor(readonly config: EngineConfig) {
    super();
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.mkdirSync(config.libraryDir, { recursive: true });
    this.library = new Library(path.join(config.dataDir, 'library.json'));
    this.settings = new SettingsStore(path.join(config.dataDir, 'settings.json'));
    this.library.on('change', () => this.emit('change'));
    this.refreshTools();
    setFaceDetectorFactory(createWasmFaceDetector);
  }

  private get modelsDir(): string {
    return path.join(this.config.dataDir, 'models');
  }

  /**
   * Resolve the external tools and point the shared pipeline code at them. The
   * shared modules read these through env vars and fluent-ffmpeg's global path,
   * so the cloud worker and the desktop engine run the very same code.
   */
  refreshTools(): void {
    for (const tool of TOOLS) {
      this.tools[tool] = resolveTool(tool, this.config);
    }
    if (this.tools.ffmpeg) ffmpeg.setFfmpegPath(this.tools.ffmpeg.path);
    if (this.tools.ffprobe) ffmpeg.setFfprobePath(this.tools.ffprobe.path);
    if (this.tools['yt-dlp']) process.env.YTDLP_PATH = this.tools['yt-dlp'].path;
    if (this.config.ytdlpJsRuntime) process.env.YTDLP_JS_RUNTIMES = this.config.ytdlpJsRuntime;
    process.env.CAPTION_FONTS_DIR = this.config.fontsDir ?? path.join(this.config.resourcesDir, 'fonts', 'captions');
  }

  status(): EngineStatus {
    const settings = this.settings.get();
    const problems: string[] = [];
    for (const tool of TOOLS) {
      if (!this.tools[tool]) problems.push(`${tool} was not found`);
    }
    const installed = isModelInstalled(this.modelsDir, settings.whisperModel);
    if (!installed) problems.push(`The Whisper model "${settings.whisperModel}" is not downloaded yet`);

    return {
      tools: { ...this.tools },
      whisperModel: settings.whisperModel,
      whisperModelInstalled: installed,
      models: WHISPER_MODELS.map((m) => ({
        id: m.id,
        label: m.label,
        sizeMb: m.sizeMb,
        installed: isModelInstalled(this.modelsDir, m.id),
      })),
      modelDownload: this.modelDownload,
      problems,
    };
  }

  /**
   * Keep yt-dlp current. YouTube breaks old builds within weeks, and the copy
   * inside a signed app bundle cannot replace itself, so the first run copies it
   * into the data dir and updates that copy to the nightly channel every few
   * days. Failures only log: the existing binary keeps working until it doesn't.
   */
  async updateYtdlp(): Promise<void> {
    const current = this.tools['yt-dlp'];
    if (!current || current.source === 'env' || current.source === 'path') return;

    const dataCopy = path.join(this.config.dataDir, 'bin', path.basename(current.path));
    const stamp = path.join(this.config.dataDir, 'bin', '.yt-dlp-updated');
    try {
      if (current.source === 'bundled') {
        await fs.promises.mkdir(path.dirname(dataCopy), { recursive: true });
        await fs.promises.copyFile(current.path, dataCopy);
        await fs.promises.chmod(dataCopy, 0o755);
      }
      const last = await fs.promises.stat(stamp).then((s) => s.mtimeMs, () => 0);
      if (Date.now() - last < YTDLP_UPDATE_INTERVAL_MS) return;

      await execFileAsync(dataCopy, ['--update-to', 'nightly'], { timeout: 120_000 });
      await fs.promises.writeFile(stamp, new Date().toISOString());
    } catch (err) {
      console.warn('[engine] yt-dlp update failed:', err instanceof Error ? err.message : err);
    } finally {
      this.refreshTools();
    }
  }

  updateSettings(patch: Partial<Settings>): Settings {
    const next = this.settings.update(patch);
    this.emit('change');
    return next;
  }

  async downloadWhisperModel(id: string): Promise<void> {
    if (this.modelDownload) throw new Error(`Already downloading the ${this.modelDownload.id} model`);
    this.modelDownload = { id, progress: 0 };
    this.emit('change');
    let lastEmit = 0;
    try {
      await downloadModel(this.modelsDir, id, (fraction) => {
        this.modelDownload = { id, progress: Math.round(fraction * 100) };
        if (Date.now() - lastEmit > 250) {
          lastEmit = Date.now();
          this.emit('change');
        }
      });
    } finally {
      this.modelDownload = null;
      this.emit('change');
    }
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  /**
   * Start importing a link or a local file. Returns at once with the record;
   * download and transcription continue in the background.
   */
  importVideo(input: { source: string; title?: string }): VideoRecord {
    const source = input.source.trim();
    const kind = classifySource(source);
    if (kind === 'file' && !fs.existsSync(source)) throw new Error(`File not found: ${source}`);

    const problems = this.status().problems;
    if (problems.length > 0) throw new Error(`Momentreel is not ready to import: ${problems.join('; ')}`);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const dir = path.join(this.config.libraryDir, `${now.slice(0, 10)}-${id.slice(0, 8)}`);
    fs.mkdirSync(path.join(dir, 'clips'), { recursive: true });

    const video = this.library.addVideo({
      id,
      title: input.title || (kind === 'file' ? path.parse(source).name : source),
      source: kind,
      sourceUrl: kind === 'file' ? undefined : source,
      sourcePath: kind === 'file' ? source : undefined,
      dir,
      status: 'queued',
      progress: 0,
      detail: 'Waiting for the previous import to finish…',
      createdAt: now,
      updatedAt: now,
    });

    this.importLane.push(() => this.runImport(id));
    return video;
  }

  private async runImport(id: string): Promise<void> {
    try {
      const video = this.library.getVideo(id)!;
      let sourcePath = video.sourcePath;

      if (video.source !== 'file') {
        sourcePath = await this.download(video);
      }

      const meta = await getVideoMetadata(sourcePath!);
      this.library.updateVideo(id, {
        sourcePath,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
      });

      const thumb = path.join(video.dir, 'thumbnail.jpg');
      await generateThumbnail(sourcePath!, thumb, { timestamp: Math.min(5, meta.duration / 2), size: '?x360' })
        .then(() => this.library.updateVideo(id, { thumbnailPath: thumb }))
        .catch((err) => console.warn(`[engine] Thumbnail failed for ${id}:`, err.message));

      await this.transcribe(id);
      this.library.updateVideo(id, { status: 'ready', progress: 100, detail: 'Ready to clip' });
    } catch (err) {
      this.library.updateVideo(id, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async download(video: VideoRecord): Promise<string> {
    this.library.updateVideo(video.id, { status: 'downloading', progress: 0, detail: 'Reading video info…' });

    const { stdout } = await execFileAsync(
      ytdlpBinary(),
      ytdlpArgs('--dump-json', '--no-download', '--no-playlist', video.sourceUrl!),
      { maxBuffer: 1024 * 1024 * 20, timeout: 90_000, env: ytdlpEnv() }
    );
    const info = JSON.parse(stdout) as { title?: string; duration?: number };
    if (info.title && video.title === video.sourceUrl) {
      this.library.updateVideo(video.id, { title: info.title });
    }

    const template = path.join(video.dir, 'source.%(ext)s');
    await downloadWithProgress(
      ytdlpArgs(
        '--no-playlist',
        // Same ceiling as the cloud clip worker: 1440p VP9 keeps 810px of real
        // width in a 9:16 crop, and AV1 decodes slowly in the bundled ffmpeg
        '--format',
        'bestvideo[height<=1440][vcodec!*=av01]+bestaudio/bestvideo[vcodec!*=av01]+bestaudio/best',
        '--merge-output-format', 'mp4',
        '-o', template,
        video.sourceUrl!
      ),
      (p) =>
        this.library.updateVideo(video.id, {
          progress: Math.round(p.fraction * 100),
          detail: ['Downloading', p.speed, p.eta && `ETA ${p.eta}`].filter(Boolean).join(' · '),
        })
    );

    const file = fs.readdirSync(video.dir).find((f) => f.startsWith('source.') && !f.endsWith('.part'));
    if (!file) throw new Error('yt-dlp finished but the video file is missing');
    return path.join(video.dir, file);
  }

  private async transcribe(id: string): Promise<void> {
    const video = this.library.getVideo(id)!;
    const settings = this.settings.get();
    this.library.updateVideo(id, { status: 'transcribing', progress: 0, detail: 'Extracting audio…' });

    const wav = path.join(video.dir, 'audio.wav');
    try {
      await extractWhisperAudio(this.tools.ffmpeg!.path, video.sourcePath!, wav);
      this.library.updateVideo(id, { detail: 'Transcribing on this computer…' });

      const result = await transcribeLocal({
        whisperCli: this.tools['whisper-cli']!.path,
        modelFile: modelPath(this.modelsDir, settings.whisperModel),
        wavPath: wav,
        language: settings.language || undefined,
        durationHint: video.duration,
        onProgress: (fraction) => this.library.updateVideo(id, { progress: Math.round(fraction * 100) }),
      });
      if (result.words.length === 0) throw new Error('No speech was found in this video');

      await fs.promises.writeFile(path.join(video.dir, 'transcript.json'), JSON.stringify(result));
      this.library.updateVideo(id, { language: result.language });
    } finally {
      await fs.promises.unlink(wav).catch(() => {});
    }
  }

  /** Resolve once the video is ready or failed, or after `seconds`. */
  async waitForVideo(id: string, seconds: number): Promise<VideoRecord> {
    const deadline = Date.now() + Math.min(seconds, MAX_WAIT_SECONDS) * 1000;
    for (;;) {
      const video = this.library.getVideo(id);
      if (!video) throw new Error(`Video ${id} not found`);
      if (video.status === 'ready' || video.status === 'failed' || Date.now() >= deadline) return video;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // ── Transcript ─────────────────────────────────────────────────────────────

  async getTranscript(id: string): Promise<TranscriptionResult> {
    const video = this.library.getVideo(id);
    if (!video) throw new Error(`Video ${id} not found`);
    if (video.status !== 'ready') throw new Error(`Video ${id} is ${video.status}, not ready yet`);
    return JSON.parse(await fs.promises.readFile(path.join(video.dir, 'transcript.json'), 'utf8'));
  }

  /**
   * Transcript lines for an agent to read, paged by character budget so a
   * three-hour stream never lands in a single tool result.
   */
  async getTranscriptPage(
    id: string,
    opts: { from?: number; to?: number; maxChars?: number }
  ): Promise<{ lines: string; nextFrom: number | null; duration: number; language: string }> {
    const transcript = await this.getTranscript(id);
    const maxChars = opts.maxChars ?? 24_000;
    const from = opts.from ?? 0;
    const to = opts.to ?? Infinity;

    const out: string[] = [];
    let used = 0;
    let nextFrom: number | null = null;
    for (const seg of transcript.segments) {
      if (seg.end <= from || seg.start >= to) continue;
      const line = formatSegment(seg);
      if (used + line.length > maxChars && out.length > 0) {
        nextFrom = seg.start;
        break;
      }
      out.push(line);
      used += line.length + 1;
    }
    return { lines: out.join('\n'), nextFrom, duration: transcript.duration, language: transcript.language };
  }

  /**
   * The heuristic shortlist the cloud pipeline sent to GPT, offered to the agent
   * as a starting point: on a long video it cuts what the agent must read by
   * most of the transcript.
   */
  async getCandidates(id: string, limit = 20) {
    const transcript = await this.getTranscript(id);
    const duration = transcript.duration;
    if (duration < SHORT_VIDEO_BYPASS_SECONDS) {
      return { mode: 'full' as const, candidates: [] };
    }
    const windows = buildExpandedWindows(
      scoreWindows(transcript.segments, { windowDuration: 30, windowStep: 15, topK: limit, minScore: 0.18 }),
      transcript.segments,
      30
    );
    return {
      mode: 'candidates' as const,
      candidates: windows.map((w, i) => ({
        index: i + 1,
        heuristicScore: Math.round(w.heuristicScore * 100),
        core: { start: round(w.startTime), end: round(w.endTime) },
        context: { start: round(w.expandedStart), end: round(w.expandedEnd) },
        lines: w.segments.map(formatSegment).join('\n'),
      })),
    };
  }

  // ── Clips ──────────────────────────────────────────────────────────────────

  createClips(
    videoId: string,
    specs: ClipSpec[],
    options: Pick<ClipRecord, 'captionStyle' | 'captionPosition' | 'captionSize'> & { burnCaptions?: boolean } = {
      captionStyle: this.settings.get().defaultCaptionStyle,
    }
  ): { created: ClipRecord[]; rejected: Array<{ title: string; reason: string }> } {
    const video = this.library.getVideo(videoId);
    if (!video) throw new Error(`Video ${videoId} not found`);
    if (video.status !== 'ready') throw new Error(`Video ${videoId} is ${video.status}, not ready yet`);

    const rejected: Array<{ title: string; reason: string }> = [];
    const now = new Date().toISOString();
    const records: ClipRecord[] = [];

    for (const spec of specs) {
      const reason = validateClipRange(spec, video.duration);
      if (reason) {
        rejected.push({ title: spec.title, reason: `"${spec.title}" ${reason}` });
        continue;
      }
      records.push({
        id: crypto.randomUUID(),
        videoId,
        title: spec.title,
        description: spec.description,
        hookText: spec.hookText,
        score: spec.score,
        tags: spec.tags ?? [],
        startTime: spec.startTime,
        endTime: spec.endTime,
        cropStrategy: {
          method: spec.cropStrategy?.method ?? 'track_speaker',
          subjectPosition: spec.cropStrategy?.subjectPosition ?? 'center',
          sceneType: spec.cropStrategy?.sceneType ?? 'single_person',
          reasoning: spec.cropStrategy?.reasoning ?? '',
        },
        layoutType: spec.layoutType ?? 'standard',
        layoutRegions: spec.layoutRegions ?? [],
        captionStyle: resolveStyleName(options.captionStyle ?? this.settings.get().defaultCaptionStyle),
        captionPosition: options.captionPosition,
        captionSize: options.captionSize,
        burnCaptions: options.burnCaptions ?? true,
        status: 'queued',
        progress: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    this.library.addClips(records);
    for (const clip of records) this.renderLane.push(() => this.renderClip(clip.id));
    return { created: records, rejected };
  }

  /** Change a clip and render it again. The previous file is replaced. */
  updateClip(
    clipId: string,
    patch: Partial<
      Pick<
        ClipRecord,
        'title' | 'startTime' | 'endTime' | 'captionStyle' | 'captionPosition' | 'captionSize' | 'burnCaptions' | 'hookText'
      >
    > & { cropStrategy?: Partial<ClipRecord['cropStrategy']> }
  ): ClipRecord {
    const clip = this.library.getClip(clipId);
    if (!clip) throw new Error(`Clip ${clipId} not found`);
    const video = this.library.getVideo(clip.videoId)!;

    const next = { startTime: patch.startTime ?? clip.startTime, endTime: patch.endTime ?? clip.endTime };
    const reason = validateClipRange(next, video.duration);
    if (reason) throw new Error(`The clip ${reason}`);

    const updated = this.library.updateClip(clipId, {
      ...patch,
      ...(patch.captionStyle ? { captionStyle: resolveStyleName(patch.captionStyle) } : {}),
      cropStrategy: { ...clip.cropStrategy, ...patch.cropStrategy },
      status: 'queued',
      progress: 0,
      error: undefined,
    });
    this.renderLane.push(() => this.renderClip(clipId));
    return updated;
  }

  private async renderClip(clipId: string): Promise<void> {
    const clip = this.library.getClip(clipId);
    if (!clip) return; // deleted while queued
    const video = this.library.getVideo(clip.videoId)!;

    try {
      if (!video.sourcePath || !fs.existsSync(video.sourcePath)) {
        throw new Error(`The source video is missing: ${video.sourcePath ?? 'never downloaded'}`);
      }
      this.library.updateClip(clipId, { status: 'rendering', progress: 0 });

      const transcript = await this.getTranscript(video.id);
      const captions = buildCaptions(clipWords(transcript.words, clip.startTime, clip.endTime), {
        style: clip.captionStyle,
        hook: clip.hookText,
      });

      const fileName = `${slugify(clip.title)}-${clip.id.slice(0, 6)}.mp4`;
      const outPath = path.join(video.dir, 'clips', fileName);
      const tmpPath = `${outPath}.rendering.mp4`;
      let renderFallback: RenderFallback | undefined;
      const composite = clip.layoutType !== 'standard' && clip.layoutType !== 'talking_head' && clip.layoutRegions.length > 0;

      // Cut the segment first. createClipSmart only cuts when the start is past
      // zero (the cloud worker always handed it a pre-cut file), so a clip that
      // begins at 0:00 would otherwise render the entire source.
      const segmentPath = `${outPath}.segment.mp4`;
      const length = clip.endTime - clip.startTime;
      await extractClip(video.sourcePath, clip.startTime, clip.endTime, segmentPath);

      await createClipSmart(segmentPath, 0, length, captions, tmpPath, {
        cropStrategy: {
          method: clip.cropStrategy.method,
          subjectPosition: clip.cropStrategy.subjectPosition,
          compositeLayout: composite ? { layoutType: clip.layoutType, layoutRegions: clip.layoutRegions } : undefined,
          onFallback: (info) => {
            renderFallback = info;
          },
        },
        burnCaptions: clip.burnCaptions,
        stylePreset: clip.captionStyle,
        captionPosition: clip.captionPosition,
        captionSize: clip.captionSize,
        onProgress: (fraction) => this.library.updateClip(clipId, { progress: Math.round(10 + fraction * 90) }),
      }).finally(() => fs.promises.unlink(segmentPath).catch(() => {}));

      // Replace the previous render only once the new one exists
      if (clip.filePath && clip.filePath !== outPath) await fs.promises.unlink(clip.filePath).catch(() => {});
      await fs.promises.rename(tmpPath, outPath);

      const thumbPath = outPath.replace(/\.mp4$/, '.jpg');
      await generateThumbnail(outPath, thumbPath, { timestamp: (clip.endTime - clip.startTime) / 2, size: '?x640' }).catch(
        (err) => console.warn(`[engine] Clip thumbnail failed for ${clipId}:`, err.message)
      );

      this.library.updateClip(clipId, {
        status: 'ready',
        progress: 100,
        filePath: outPath,
        thumbnailPath: fs.existsSync(thumbPath) ? thumbPath : undefined,
        renderFallback,
      });
    } catch (err) {
      this.library.updateClip(clipId, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Deletion ───────────────────────────────────────────────────────────────

  async deleteClip(clipId: string): Promise<void> {
    const clip = this.library.removeClip(clipId);
    if (clip?.filePath) await fs.promises.unlink(clip.filePath).catch(() => {});
    if (clip?.thumbnailPath) await fs.promises.unlink(clip.thumbnailPath).catch(() => {});
  }

  /** Deletes what the engine wrote. A local source file the user imported is left alone. */
  async deleteVideo(videoId: string): Promise<void> {
    const { video } = this.library.removeVideo(videoId);
    if (video) await fs.promises.rm(video.dir, { recursive: true, force: true });
  }

  shutdown(): void {
    this.library.flush();
  }
}

export function classifySource(source: string): VideoSource {
  if (/^https?:\/\//i.test(source)) {
    return /(^|\.)(youtube\.com|youtu\.be)$/i.test(safeHost(source)) ? 'youtube' : 'url';
  }
  return 'file';
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** `[83.4-91.2] text` — compact, and exactly the timestamps a clip spec uses. */
function formatSegment(seg: TranscriptionSegment): string {
  return `[${round(seg.start)}-${round(seg.end)}] ${seg.text}`;
}

export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'clip';
}
