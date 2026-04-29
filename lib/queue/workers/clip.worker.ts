import { Worker, Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '@/infra/prisma';
import { generateCaptions } from '@/lib/ai/captions';
import { createClipSmart, generateProxy } from '@/lib/video/processor';
import { getStorageClient } from '@/lib/video/storage';
import { createRedisConnection, QUEUE_NAME, type ClipJobData } from '../queue';
import type { WordTimestamp } from '@/lib/ai/transcribe';
import type { CaptionStyleName } from '@/lib/ai/caption-styles';

const execAsync = promisify(exec);

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
    data: { status: 'GENERATING' },
  });

  const segmentPath = join(tmpdir(), `segment-${clipId}.mp4`);
  const outputPath = join(tmpdir(), `clip-out-${clipId}.mp4`);
  const proxyPath = join(tmpdir(), `proxy-${clipId}.mp4`);

  try {
    // 1. Download only the clip segment
    if (video.source === 'YOUTUBE' && video.sourceUrl) {
      const startTime = Math.floor(clip.startTime);
      const endTime = Math.ceil(clip.endTime);
      const cmd = [
        'yt-dlp',
        `--download-sections "*${startTime}-${endTime}"`,
        '--force-keyframes-at-cuts',
        '--format "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]"',
        '--merge-output-format mp4',
        `-o "${segmentPath}"`,
        `"${video.sourceUrl}"`,
      ].join(' ');
      await execAsync(cmd, { maxBuffer: 1024 * 1024 * 100 });
      console.log(`[clip] YouTube segment downloaded for clip ${clipId}`);
    } else if (video.storageUrl) {
      // For uploads: fast seek cut without re-encode (stream copy)
      const cmd = `ffmpeg -ss ${clip.startTime} -to ${clip.endTime} -i "${video.storageUrl}" -c copy "${segmentPath}" -y`;
      await execAsync(cmd, { maxBuffer: 1024 * 1024 * 50 });
      console.log(`[clip] Segment extracted from upload for clip ${clipId}`);
    } else {
      throw new Error('No source URL available for clip extraction');
    }

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
    const language = video.transcription.language ?? undefined;

    const captions = await generateCaptions(clipWords, {
      maxWordsPerSegment: 3,
      emphasizeKeywords: true,
      includeHook: true,
      language,
      stylePreset: captionStyle,
    });

    // Apply per-clip caption position override to all segments
    if (captionPosition) {
      captions.captions = captions.captions.map((seg) => ({ ...seg, position: captionPosition }));
    }

    // 4. Process clip with smart cropping and burned captions
    const layoutType = (metadata?.layoutType ?? 'standard') as string;
    const cropStrategy = (metadata?.cropStrategy ?? { method: 'wide_shot' }) as { method: string; subjectPosition?: string };

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
        },
        burnCaptions: true,
        stylePreset: captionStyle,
        captionPosition,
        captionSize,
      }
    );

    // 5. Upload clip
    const storage = getStorageClient();
    const clipBuffer = await readFile(outputPath);
    const clipFile = new File([clipBuffer.buffer as ArrayBuffer], `clip-${clipId}.mp4`, { type: 'video/mp4' });
    const uploadResult = await storage.uploadClip(clipFile, video.companyId, videoId, clipId);

    // 5b. Generate and upload proxy video
    let proxyUrl: string | undefined;
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

    // Explicit cleanup of outputPath now that proxy is done
    await unlink(outputPath).catch(() => {});

    // 6. Save clip record
    await prismaClientGlobal.clip.update({
      where: { id: clipId },
      data: {
        storageUrl: uploadResult.url,
        status: 'READY',
        captions: captions as any,
        metadata: {
          ...(metadata ?? {}),
          ...(proxyUrl ? { proxyUrl } : {}),
        },
      },
    });

    console.log(`[clip] Clip ${clipId} ready: ${uploadResult.url}`);

    // 7. Check if all clips for this video are done → mark video READY
    const pendingClips = await prismaClientGlobal.clip.count({
      where: { videoId, status: { in: ['PENDING', 'GENERATING'] } },
    });

    if (pendingClips === 0) {
      await prismaClientGlobal.video.update({
        where: { id: videoId },
        data: { status: 'READY' },
      });
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
