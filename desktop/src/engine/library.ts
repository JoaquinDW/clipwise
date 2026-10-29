/**
 * The local library: every imported video and every clip cut from it.
 *
 * One JSON file, held in memory and written back atomically. The engine is the
 * only writer (the MCP server and the app UI both go through it), so there is
 * no locking to do, and a library of a few hundred videos is a few hundred KB —
 * not worth a native SQLite module that would have to be rebuilt per Electron
 * version and per platform.
 */
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import type { ClipRecord, LibraryData, VideoRecord } from './types';

const EMPTY: LibraryData = { version: 1, videos: [], clips: [] };

/** Progress ticks arrive several times a second; disk only needs to see them this often. */
const WRITE_DEBOUNCE_MS = 400;

export class Library extends EventEmitter {
  private data: LibraryData;
  private writeTimer: NodeJS.Timeout | null = null;

  constructor(private readonly file: string) {
    super();
    this.data = Library.load(file);
  }

  private static load(file: string): LibraryData {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as LibraryData;
      if (parsed.version !== 1) throw new Error(`Unknown library version ${parsed.version}`);
      return Library.recoverInterrupted(parsed);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(EMPTY);
      // A corrupt library must not be silently replaced by an empty one: keep the
      // file aside so the user's clips can still be recovered by hand.
      const aside = `${file}.corrupt-${Date.now()}`;
      fs.renameSync(file, aside);
      console.error(`[library] Could not read ${file}, moved it to ${aside}:`, err);
      return structuredClone(EMPTY);
    }
  }

  /**
   * Work that was running when the app quit never finished. Left as is, its
   * spinner would turn forever, so it comes back as failed with a reason the
   * user can act on.
   */
  private static recoverInterrupted(data: LibraryData): LibraryData {
    const interrupted = 'Interrupted when the app closed. Import or render it again.';
    for (const video of data.videos) {
      if (video.status === 'queued' || video.status === 'downloading' || video.status === 'transcribing') {
        video.status = 'failed';
        video.error = interrupted;
      }
    }
    for (const clip of data.clips) {
      if (clip.status === 'queued' || clip.status === 'rendering') {
        clip.status = 'failed';
        clip.error = interrupted;
      }
    }
    return data;
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  listVideos(): VideoRecord[] {
    return [...this.data.videos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getVideo(id: string): VideoRecord | undefined {
    return this.data.videos.find((v) => v.id === id);
  }

  listClips(videoId?: string): ClipRecord[] {
    const clips = videoId ? this.data.clips.filter((c) => c.videoId === videoId) : this.data.clips;
    return [...clips].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.startTime - b.startTime);
  }

  getClip(id: string): ClipRecord | undefined {
    return this.data.clips.find((c) => c.id === id);
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  addVideo(video: VideoRecord): VideoRecord {
    this.data.videos.push(video);
    this.changed();
    return video;
  }

  updateVideo(id: string, patch: Partial<VideoRecord>): VideoRecord {
    const video = this.getVideo(id);
    if (!video) throw new Error(`Video ${id} not found`);
    Object.assign(video, patch, { updatedAt: new Date().toISOString() });
    this.changed();
    return video;
  }

  addClips(clips: ClipRecord[]): ClipRecord[] {
    this.data.clips.push(...clips);
    this.changed();
    return clips;
  }

  updateClip(id: string, patch: Partial<ClipRecord>): ClipRecord {
    const clip = this.getClip(id);
    if (!clip) throw new Error(`Clip ${id} not found`);
    Object.assign(clip, patch, { updatedAt: new Date().toISOString() });
    this.changed();
    return clip;
  }

  /** Removes the records only; the caller owns the files on disk. */
  removeVideo(id: string): { video?: VideoRecord; clips: ClipRecord[] } {
    const video = this.getVideo(id);
    const clips = this.data.clips.filter((c) => c.videoId === id);
    this.data.videos = this.data.videos.filter((v) => v.id !== id);
    this.data.clips = this.data.clips.filter((c) => c.videoId !== id);
    this.changed();
    return { video, clips };
  }

  removeClip(id: string): ClipRecord | undefined {
    const clip = this.getClip(id);
    this.data.clips = this.data.clips.filter((c) => c.id !== id);
    this.changed();
    return clip;
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private changed(): void {
    this.emit('change');
    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      this.flush();
    }, WRITE_DEBOUNCE_MS);
  }

  /** Write now. Called on quit so the last progress tick is not lost. */
  flush(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    // Write-then-rename: a crash mid-write leaves the previous library intact
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
}
