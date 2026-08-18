/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, Job } from 'bullmq';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '@/infra/prisma';
import { generateCaptions, type CaptionsResult } from '@/lib/ai/captions';
import { sliceCaptions } from '@/lib/ai/caption-slice';
import { burnCaptions as burnCaptionsOnto, createClipSmart, generateProxy, generateThumbnail, type RenderFallback } from '@/lib/video/processor';
import { getStorageClient } from '@/lib/video/storage';
import { ytdlpArgs, downloadWithProgress } from '@/lib/video/ytdlp';
import { makeClipReporter, setStage, subBand } from '@/lib/video/progress';
import { createRedisConnection, QUEUE_NAME, type ClipJobData } from '../queue';
import type { WordTimestamp } from '@/lib/ai/transcribe';
import type { CaptionStyleName } from '@/lib/ai/caption-styles';

// argv form: user-supplied URLs must never be spliced into a shell string
const execFileAsync = promisify(execFile);

/** Trim deltas are rounded to 0.1s, so anything tighter is float noise. */
const TIME_EPSILON = 0.05;

/**
 * The clip this one was edited from, when it can serve as a base.
 *
 * Two independent things can be inherited from it, and the caller decides each
 * one separately:
 *
 *  - its **captions**, whenever it has them, re-timed onto the new range. The
 *    editor previews the stored captions, so reusing them is the only way the
 *    burned-in text can match what the user saw — asking generateCaptions again
 *    runs an LLM whose prompt includes the style preset, and returns a different
 *    grouping.
 *  - its **pixels**, only when the trim did not move, since the file is then
 *    already cut to these bounds and cropped to 9:16, missing nothing but the
 *    captions. That skips the yt-dlp round trip entirely, which matters for
 *    YouTube and stream sources where only the audio is kept and every render
 *    otherwise re-downloads the segment and inherits its 403s.
 *
 * Returns null unless the parent is caption-free: burning onto an already
 * captioned file would stack a second set on top of the first.
 */
async function findEditBase(clip: {
  parentClipId: string | null;
  startTime: number;
  endTime: number;
  metadata: unknown;
}) {
  if (!clip.parentClipId) return null;
  // Inheriting only makes sense when the caption pass is the whole job; without
  // it there would be nothing left to render.
  if ((clip.metadata as Record<string, unknown> | null)?.burnCaptions !== true) return null;

  const parent = await prismaClientGlobal.clip.findUnique({
    where: { id: clip.parentClipId },
    select: {
      status: true,
      storageUrl: true,
      startTime: true,
      endTime: true,
      metadata: true,
      captions: true,
    },
  });

  if (!parent?.storageUrl || parent.status !== 'READY') return null;
  if ((parent.metadata as Record<string, unknown> | null)?.burnCaptions === true) return null;

  const sameBounds =
    Math.abs(parent.startTime - clip.startTime) <= TIME_EPSILON &&
    Math.abs(parent.endTime - clip.endTime) <= TIME_EPSILON;

  return {
    captions: (parent.captions ?? null) as CaptionsResult | null,
    /** How far the new clip's start moved, for re-timing the captions. */
    captionOffset: clip.startTime - parent.startTime,
    /** Set only when the parent's rendered file can be reused as-is. */
    pixelUrl: sameBounds ? parent.storageUrl : null,
  };
}

export async function processClip(job: Job<ClipJobData>) {
  const { videoId, clipId } = job.data;
  console.log(`[clip] Starting clip ${clipId}`);

  const [clip, video] = await Promise.all([
    prismaClientGlobal.clip.findUnique({ where: { id: clipId } }),
    prismaClientGlobal.video.findUnique({
      where: { id: videoId },
      include: { transcription: true },
    }),
  ]);

  if (!clip || !video) throw new Error(`Clip or video not found: ${clipId}`);
  if (!video.transcription) throw new Error('No transcription on video');

  await prismaClientGlobal.clip.update({
    where: { id: clipId },
    data: { status: 'GENERATING', progress: 0 },
  });

  // Fetching the source pixels owns 0-35, the encode 35-90, the upload the rest.
  const clipDuration = clip.endTime - clip.startTime;
  const renderProgress = makeClipReporter(clipId);

  const segmentPath = join(tmpdir(), `segment-${clipId}.mp4`);
  const outputPath = join(tmpdir(), `clip-out-${clipId}.mp4`);
  const proxyPath = join(tmpdir(), `proxy-${clipId}.mp4`);

  try {
    // 1. Get the pixels to work from. An edit that left the trim alone reuses
    //    the clip it came from; everything else goes back to the source video.
    const editBase = await findEditBase(clip);

    const videoSource: string = video.source;
    if (editBase?.pixelUrl) {
      const res = await fetch(editBase.pixelUrl);
      if (!res.ok) throw new Error(`Could not fetch base clip: ${res.status}`);
      await writeFile(segmentPath, Buffer.from(await res.arrayBuffer()));
      console.log(`[clip] Reusing rendered clip as caption base for ${clipId}`);
    } else if ((videoSource === 'YOUTUBE' || videoSource === 'TWITCH' || videoSource === 'KICK') && video.sourceUrl) {
      const startTime = Math.floor(clip.startTime);
      const endTime = Math.ceil(clip.endTime);
      await downloadWithProgress(
        ytdlpArgs(
          '--download-sections', `*${startTime}-${endTime}`,
          '--force-keyframes-at-cuts',
          // Not 'ext=mp4': that restricts YouTube to AVC, which caps at 1080p, and a
          // 9:16 crop of a 1080p frame keeps only 607px of real width. 1440p VP9
          // gives 810px instead. AV1 is excluded because the bundled ffmpeg 4.4 has
          // only libaom to decode it, which is far slower than dav1d.
          '--format',
          'bestvideo[height<=1440][vcodec!*=av01]+bestaudio/bestvideo[vcodec!*=av01]+bestaudio/best',
          '--merge-output-format', 'mp4',
          '-o', segmentPath,
          video.sourceUrl,
        ),
        (p) => renderProgress.report(subBand(0, 35, p.fraction))
      );
      console.log(`[clip] YouTube segment downloaded for clip ${clipId}`);
    } else if (video.storageUrl) {
      // For uploads: fast seek cut without re-encode (stream copy)
      await execFileAsync(
        'ffmpeg',
        ['-ss', String(clip.startTime), '-to', String(clip.endTime), '-i', video.storageUrl, '-c', 'copy', segmentPath, '-y'],
        { maxBuffer: 1024 * 1024 * 50 }
      );
      console.log(`[clip] Segment extracted from upload for clip ${clipId}`);
    } else {
      throw new Error('No source URL available for clip extraction');
    }

    renderProgress.report(35);

    // 2. Extract words for this clip time range, adjusted to clip-relative time
    const allWords = video.transcription.words as unknown as WordTimestamp[];
    const clipWords = allWords
      .filter((w) => w.start >= clip.startTime && w.end <= clip.endTime)
      .map((w) => ({ word: w.word, start: w.start - clip.startTime, end: w.end - clip.startTime }));

    // 3. Generate captions
    const metadata = clip.metadata as Record<string, unknown> | null;
    const captionStyle = (metadata?.captionStyle ?? undefined) as CaptionStyleName | undefined;
    const captionPosition = (metadata?.captionPosition ?? undefined) as 'top' | 'center' | 'bottom' | undefined;
    const captionSize = (metadata?.captionSize ?? undefined) as 'small' | 'medium' | 'large' | undefined;
    const shouldBurnCaptions = metadata?.burnCaptions === true;
    const language = video.transcription.language ?? undefined;

    // An edit re-times the captions the editor was previewing rather than asking
    // the model for new ones, which is the only way the burned-in text can match
    // what the user saw. Regenerating is the fallback for a parent that somehow
    // has none stored.
    const captions = editBase?.captions
      ? sliceCaptions(editBase.captions, editBase.captionOffset, clip.endTime - clip.startTime)
      : await generateCaptions(clipWords, {
        maxWordsPerSegment: 3,
        emphasizeKeywords: true,
        includeHook: true,
        language,
        stylePreset: captionStyle,
      });

    if (editBase?.captions) {
      console.log(`[clip] Reusing parent captions for ${clipId} (offset ${editBase.captionOffset}s)`);
    }

    // Caption position is not written into the segments any more. It is a
    // render setting, applied by the layout engine from clip metadata, so
    // stamping it onto the stored captions only persisted a value nothing reads
    // and made the saved captions differ by how they were last exported.

    // 4. Process clip with smart cropping.
    //    Captions are only burned when this is a re-export (burnCaptions flag in metadata).
    //    Initial clips stay caption-free so the editor overlay is the only source of truth.
    const layoutType = (metadata?.layoutType ?? 'standard') as string;
    const cropStrategy = (metadata?.cropStrategy ?? { method: 'wide_shot' }) as { method: string; subjectPosition?: string };

    // Recorded on the clip so a downgraded render is visible in the database
    // instead of only in a log line nobody reads
    let renderFallback: RenderFallback | undefined;

    if (editBase?.pixelUrl) {
      // Already cropped and cut — the only thing left to do is the caption pass.
      await burnCaptionsOnto(segmentPath, captions, outputPath, captionStyle, {
        captionPosition,
        captionSize,
        duration: clipDuration,
        onProgress: (fraction) => renderProgress.report(subBand(35, 90, fraction)),
      });
    } else {
      await createClipSmart(
        segmentPath,
        0,
        clip.endTime - clip.startTime,
        captions,
        outputPath,
        {
          cropStrategy: {
            method: cropStrategy.method as any,
            subjectPosition: (cropStrategy.subjectPosition ?? 'center') as any,
            compositeLayout:
              layoutType !== 'standard' && layoutType !== 'talking_head'
                ? { layoutType: layoutType as any, layoutRegions: metadata?.layoutRegions as any }
                : undefined,
            onFallback: (info) => {
              renderFallback = info;
              console.warn(`[clip] ${clipId} fell back from ${info.from}: ${info.reason}`);
            },
          },
          onProgress: (fraction) => renderProgress.report(subBand(35, 90, fraction)),
          burnCaptions: shouldBurnCaptions,
          ...(shouldBurnCaptions && { stylePreset: captionStyle, captionPosition, captionSize }),
        }
      );
    }

    // 5. Upload clip
    renderProgress.report(90);
    const storage = getStorageClient();
    const clipBuffer = await readFile(outputPath);
    const clipFile = new File([clipBuffer.buffer as ArrayBuffer], `clip-${clipId}.mp4`, { type: 'video/mp4' });
    const uploadResult = await storage.uploadClip(clipFile, video.companyId, videoId, clipId);

    // A burned render is a deliverable: it never appears in the clip list and is
    // never previewed, so the proxy and thumbnail it would get are two encodes
    // spent on files nothing ever loads.
    const isDeliverable = shouldBurnCaptions;

    // 5b. Generate and upload proxy video
    let proxyUrl: string | undefined;
    if (!isDeliverable) {
      try {
        await generateProxy(outputPath, proxyPath);
        const proxyBuffer = await readFile(proxyPath);
        const proxyFile = new File([proxyBuffer.buffer as ArrayBuffer], `proxy-${clipId}.mp4`, { type: 'video/mp4' });
        const proxyResult = await storage.uploadProxy(proxyFile, video.companyId, videoId, clipId);
        proxyUrl = proxyResult.url;
        console.log(`[clip] Proxy uploaded for clip ${clipId}: ${proxyUrl}`);
      } catch (proxyErr) {
        // Proxy failure is non-fatal — editor falls back to storageUrl
        console.warn(`[clip] Proxy generation failed (non-fatal) for ${clipId}:`, proxyErr);
      } finally {
        await unlink(proxyPath).catch(() => {});
      }
    }

    // 5c. Generate and upload clip thumbnail — from the rendered 9:16 clip, not
    // the landscape source segment, so the preview matches what plays. Frame is
    // taken mid-clip to dodge fades and black frames at the cut.
    let clipThumbnailUrl: string | undefined;
    const thumbPath = join(tmpdir(), `thumb-${clipId}.jpg`);
    if (!isDeliverable) {
      try {
        await generateThumbnail(outputPath, thumbPath, {
          timestamp: (clip.endTime - clip.startTime) / 2,
          size: '?x960',
        });
        const thumbBuffer = await readFile(thumbPath);
        const thumbArrayBuffer = thumbBuffer.buffer.slice(thumbBuffer.byteOffset, thumbBuffer.byteOffset + thumbBuffer.byteLength) as ArrayBuffer;
        const thumbBlob = new Blob([thumbArrayBuffer], { type: 'image/jpeg' });
        const thumbResult = await (storage as any).uploadThumbnail(thumbBlob, video.companyId, videoId, clipId);
        clipThumbnailUrl = thumbResult.url;
        console.log(`[clip] Thumbnail uploaded for clip ${clipId}: ${clipThumbnailUrl}`);
      } catch (thumbErr) {
        // Non-fatal, but loud: a silent warn here is how this went unnoticed before
        console.error(`[clip] Thumbnail generation failed (non-fatal) for ${clipId}:`, thumbErr);
      } finally {
        await unlink(thumbPath).catch(() => {});
      }
    }

    // Explicit cleanup of outputPath now that proxy and thumbnail are done
    await unlink(outputPath).catch(() => {});

    // 6. Save clip record
    // Drain the throttled writer first: a queued 87% landing after this update
    // would drag a finished clip's bar backwards.
    await renderProgress.flush();
    await prismaClientGlobal.clip.update({
      where: { id: clipId },
      data: {
        storageUrl: uploadResult.url,
        status: 'READY',
        progress: 100,
        captions: captions as any,
        ...(clipThumbnailUrl ? { thumbnailUrl: clipThumbnailUrl } : {}),
        metadata: {
          ...(metadata ?? {}),
          ...(proxyUrl ? { proxyUrl } : {}),
          ...(renderFallback ? { renderFallback } : {}),
        },
      },
    });

    console.log(`[clip] Clip ${clipId} ready: ${uploadResult.url}`);

    // 7. Check if all clips for this video are done → mark video READY
    const pendingClips = await prismaClientGlobal.clip.count({
      where: { videoId, status: { in: ['PENDING', 'GENERATING'] } },
    });

    if (pendingClips === 0) {
      await setStage(videoId, 'READY');
      console.log(`[clip] All clips done — video ${videoId} is READY`);
    }
  } finally {
    await unlink(segmentPath).catch(() => {});
    // outputPath is cleaned up explicitly above; this is a safety net
    await unlink(outputPath).catch(() => {});
  }
}

export function startClipWorker() {
  const worker = new Worker<ClipJobData>(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'clip') await processClip(job);
    },
    // Higher concurrency for clip jobs — they run independently
    { connection: createRedisConnection(), concurrency: 5 }
  );

  worker.on('failed', async (job, err) => {
    console.error(`[clip] Job failed for clip ${job?.data.clipId}:`, err.message);
    if (job?.data.clipId) {
      await prismaClientGlobal.clip.update({
        where: { id: job.data.clipId },
        data: { status: 'FAILED', errorMessage: err.message },
      }).catch(() => {});
    }
  });

  return worker;
}
