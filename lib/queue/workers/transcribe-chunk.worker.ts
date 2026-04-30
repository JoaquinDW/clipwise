import { Job } from 'bullmq';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '@/infra/prisma';
import { transcribeChunk } from '@/lib/ai/transcribe-chunk';
import { enqueueAnalyze, type TranscribeChunkJobData } from '../queue';
import type { TranscriptionSegment, WordTimestamp } from '@/lib/ai/transcribe';

export async function processTranscribeChunk(job: Job<TranscribeChunkJobData>) {
  const { videoId, chunkId, chunkIndex, totalChunks } = job.data;
  console.log(`[transcribe-chunk] Processing chunk ${chunkIndex + 1}/${totalChunks} for video ${videoId}`);

  // Mark video as TRANSCRIBING on the first chunk (idempotent if called multiple times)
  if (chunkIndex === 0) {
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'TRANSCRIBING' },
    });
  }

  const chunk = await prismaClientGlobal.audioChunk.findUnique({ where: { id: chunkId } });
  if (!chunk?.storageUrl) throw new Error(`Chunk ${chunkId} has no storageUrl`);

  const localPath = join(tmpdir(), `tc-chunk-${chunkId}.m4a`);
  try {
    // Download the chunk audio locally for Whisper
    const res = await fetch(chunk.storageUrl);
    if (!res.ok) throw new Error(`Failed to fetch chunk audio: ${res.status}`);
    await writeFile(localPath, Buffer.from(await res.arrayBuffer()));

    // Transcribe with absolute timestamp offset
    const result = await transcribeChunk(localPath, chunk.startTime);

    await prismaClientGlobal.audioChunk.update({
      where: { id: chunkId },
      data: {
        status: 'DONE',
        transcript: { segments: result.segments, words: result.words } as any,
      },
    });

    console.log(`[transcribe-chunk] Chunk ${chunkIndex + 1}/${totalChunks} done: ${result.segments.length} segments`);
  } finally {
    await unlink(localPath).catch(() => {});
  }

  // Check if all chunks for this video are done
  const doneCount = await prismaClientGlobal.audioChunk.count({
    where: { videoId, status: 'DONE' },
  });

  if (doneCount < totalChunks) {
    console.log(`[transcribe-chunk] ${doneCount}/${totalChunks} chunks done — waiting for remaining`);
    return;
  }

  // All chunks done — merge and advance the pipeline
  console.log(`[transcribe-chunk] All ${totalChunks} chunks done — merging transcription for video ${videoId}`);

  const allChunks = await prismaClientGlobal.audioChunk.findMany({
    where: { videoId, status: 'DONE' },
    orderBy: { index: 'asc' },
  });

  const allSegments: TranscriptionSegment[] = allChunks.flatMap(
    (c) => ((c.transcript as any)?.segments ?? []) as TranscriptionSegment[]
  );
  const allWords: WordTimestamp[] = allChunks.flatMap(
    (c) => ((c.transcript as any)?.words ?? []) as WordTimestamp[]
  );
  const fullText = allSegments.map((s) => s.text).join(' ');
  const language = (allChunks[0]?.transcript as any)?.language ?? 'en';

  await prismaClientGlobal.transcription.upsert({
    where: { videoId },
    create: { videoId, text: fullText, language, segments: allSegments as any, words: allWords as any },
    update: { text: fullText, language, segments: allSegments as any, words: allWords as any },
  });

  await prismaClientGlobal.video.update({
    where: { id: videoId },
    data: { status: 'TRANSCRIBED' },
  });

  await enqueueAnalyze({ videoId });
  console.log(`[transcribe-chunk] Merged transcription saved, analyze enqueued for video ${videoId}`);
}
