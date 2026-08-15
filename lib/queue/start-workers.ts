/* eslint-disable @typescript-eslint/no-explicit-any, indent, no-multi-spaces */
import { Worker } from 'bullmq';
import { createRedisConnection, QUEUE_NAME } from './queue';
import { prismaClientGlobal } from '@/infra/prisma';
import { processIngest } from './workers/ingest.worker';
import { processTranscribe } from './workers/transcribe.worker';
import { processTranscribeChunk } from './workers/transcribe-chunk.worker';
import { processAnalyze } from './workers/analyze.worker';
import { processClip } from './workers/clip.worker';

export function startAllWorkers() {
  // Single worker handles all job types — prevents multiple workers competing
  // for the same queue and silently completing jobs they don't own.
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case 'ingest':            return processIngest(job as any);
        case 'transcribe':        return processTranscribe(job as any);
        case 'transcribe-chunk':  return processTranscribeChunk(job as any);
        case 'analyze':           return processAnalyze(job as any);
        case 'clip':              return processClip(job as any);
        default:
          console.warn(`[worker] Unknown job type: ${job.name}`);
      }
    },
    { connection: createRedisConnection(), concurrency: 2 }
  );

  worker.on('completed', (job) => {
    console.log(`[worker] ✓ ${job.name} completed — data: ${JSON.stringify(job.data)}`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[worker] ✗ ${job?.name} failed:`, err.message);
    if (!job?.data) return;
    const { videoId, clipId } = job.data as any;
    if (clipId) {
      await prismaClientGlobal.clip.update({
        where: { id: clipId },
        data: { status: 'FAILED', errorMessage: err.message },
      }).catch(() => {});
    } else if (videoId) {
      await prismaClientGlobal.video.update({
        where: { id: videoId },
        data: { status: 'FAILED', errorMessage: err.message },
      }).catch(() => {});
    }
  });

  console.log(`[workers] Unified worker started on queue "${QUEUE_NAME}" (concurrency: 2)`);

  const shutdown = async () => {
    console.log('[workers] Shutting down...');
    await worker.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return [worker];
}
