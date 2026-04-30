/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, Job } from 'bullmq';
import { prismaClientGlobal } from '@/infra/prisma';
import { detectHighlights } from '@/lib/ai/highlights';
import { createRedisConnection, QUEUE_NAME, enqueueClip, type AnalyzeJobData } from '../queue';
import type { TranscriptionSegment } from '@/lib/ai/transcribe';

export async function processAnalyze(job: Job<AnalyzeJobData>) {
  const { videoId } = job.data;
  console.log(`[analyze] Starting for video ${videoId}`);

  const video = await prismaClientGlobal.video.findUnique({
    where: { id: videoId },
    include: { transcription: true },
  });

  if (!video?.transcription) throw new Error('No transcription found for video');

  await prismaClientGlobal.video.update({
    where: { id: videoId },
    data: { status: 'PROCESSING' },
  });

  const segments = video.transcription.segments as unknown as TranscriptionSegment[];

  const highlights = await detectHighlights(segments, {
    maxHighlights: 5,
    minDuration: 15,
    maxDuration: 60,
    targetAudience: 'TikTok, Instagram Reels, YouTube Shorts users',
    contentType: 'video content',
  });

  console.log(`[analyze] Found ${highlights.highlights.length} highlights`);

  const captionStyle = (video.metadata as any)?.captionStyle;

  // Create clip records and enqueue clip jobs in parallel
  await Promise.all(
    highlights.highlights.map(async (highlight) => {
      const clip = await prismaClientGlobal.clip.create({
        data: {
          videoId,
          title: highlight.title,
          description: highlight.description,
          startTime: highlight.startTime,
          endTime: highlight.endTime,
          duration: highlight.endTime - highlight.startTime,
          score: highlight.score,
          status: 'PENDING',
          metadata: {
            hookText: highlight.hookText,
            tags: highlight.tags,
            cropStrategy: {
              method: highlight.cropStrategy.method,
              subjectPosition: highlight.cropStrategy.subjectPosition,
              sceneType: highlight.cropStrategy.sceneType,
              reasoning: highlight.cropStrategy.reasoning,
            },
            layoutType: highlight.layoutType ?? 'standard',
            layoutRegions: highlight.layoutRegions?.length ? highlight.layoutRegions : null,
            captionStyle: captionStyle ?? null,
          },
        },
      });

      await enqueueClip({ videoId, clipId: clip.id });
      console.log(`[analyze] Enqueued clip job for: ${highlight.title}`);
    })
  );
}

export function startAnalyzeWorker() {
  const worker = new Worker<AnalyzeJobData>(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'analyze') await processAnalyze(job);
    },
    { connection: createRedisConnection(), concurrency: 2 }
  );

  worker.on('failed', async (job, err) => {
    console.error(`[analyze] Job failed for video ${job?.data.videoId}:`, err.message);
    if (job?.data.videoId) {
      await prismaClientGlobal.video.update({
        where: { id: job.data.videoId },
        data: { status: 'FAILED', errorMessage: err.message },
      }).catch(() => {});
    }
  });

  return worker;
}
