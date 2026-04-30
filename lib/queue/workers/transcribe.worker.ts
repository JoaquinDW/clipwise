/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '@/infra/prisma';
import { transcribeChunk } from '@/lib/ai/transcribe-chunk';
import { createRedisConnection, QUEUE_NAME, enqueueAnalyze, type TranscribeJobData } from '../queue';
import type { TranscriptionSegment, WordTimestamp } from '@/lib/ai/transcribe';

const execAsync = promisify(exec);

const CHUNK_DURATION = parseInt(process.env.AUDIO_CHUNK_DURATION || '300', 10); // 5 minutes default

export async function processTranscribe(job: Job<TranscribeJobData>) {
  const { videoId } = job.data;
  console.log(`[transcribe] Starting for video ${videoId}`);

  const video = await prismaClientGlobal.video.findUnique({ where: { id: videoId } });
  if (!video?.audioUrl) throw new Error('Video has no audioUrl — run ingest first');

  await prismaClientGlobal.video.update({
    where: { id: videoId },
    data: { status: 'TRANSCRIBING' },
  });

  const audioLocalPath = join(tmpdir(), `audio-full-${videoId}.m4a`);
  const chunkDir = join(tmpdir(), `chunks-${videoId}`);

  try {
    // 1. Download audio from storage
    const audioResponse = await fetch(video.audioUrl);
    if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
    const audioBuffer = await audioResponse.arrayBuffer();
    await writeFile(audioLocalPath, Buffer.from(audioBuffer));
    console.log(`[transcribe] Audio downloaded locally`);

    // 2. Get duration with ffprobe
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioLocalPath}"`
    );
    const totalDuration = parseFloat(stdout.trim());
    console.log(`[transcribe] Total duration: ${totalDuration}s`);

    // 3. Split into chunks
    await execAsync(`mkdir -p "${chunkDir}"`);
    await execAsync(
      `ffmpeg -i "${audioLocalPath}" -f segment -segment_time ${CHUNK_DURATION} -c copy "${chunkDir}/chunk-%d.m4a" -y`
    );

    const chunkFiles = (await readdir(chunkDir))
      .filter((f) => f.startsWith('chunk-') && f.endsWith('.m4a'))
      .sort((a, b) => {
        const numA = parseInt(a.replace('chunk-', '').replace('.m4a', ''));
        const numB = parseInt(b.replace('chunk-', '').replace('.m4a', ''));
        return numA - numB;
      });

    console.log(`[transcribe] Split into ${chunkFiles.length} chunks`);

    // 4. Create AudioChunk records
    await prismaClientGlobal.audioChunk.deleteMany({ where: { videoId } });
    const chunkRecords = await Promise.all(
      chunkFiles.map((file, i) =>
        prismaClientGlobal.audioChunk.create({
          data: {
            videoId,
            index: i,
            startTime: i * CHUNK_DURATION,
            endTime: Math.min((i + 1) * CHUNK_DURATION, totalDuration),
            status: 'TRANSCRIBING',
          },
        })
      )
    );

    // 5. Transcribe chunks sequentially to avoid Whisper rate limits
    const chunkResults = [];
    for (let i = 0; i < chunkFiles.length; i++) {
      const chunkPath = join(chunkDir, chunkFiles[i]);
      const offsetSeconds = i * CHUNK_DURATION;
      console.log(`[transcribe] Chunk ${i + 1}/${chunkFiles.length} (offset ${offsetSeconds}s)`);
      const result = await transcribeChunk(chunkPath, offsetSeconds);

      await prismaClientGlobal.audioChunk.update({
        where: { id: chunkRecords[i].id },
        data: {
          status: 'DONE',
          transcript: { segments: result.segments, words: result.words } as any,
        },
      });

      chunkResults.push(result);
    }

    // 6. Merge and sort all segments and words
    const allSegments: TranscriptionSegment[] = chunkResults
      .flatMap((r) => r.segments)
      .sort((a, b) => a.start - b.start);

    const allWords: WordTimestamp[] = chunkResults
      .flatMap((r) => r.words)
      .sort((a, b) => a.start - b.start);

    const fullText = allSegments.map((s) => s.text).join(' ');
    const language = chunkResults[0]?.language || 'en';

    // 7. Save transcription
    await prismaClientGlobal.transcription.upsert({
      where: { videoId },
      create: {
        videoId,
        text: fullText,
        language,
        segments: allSegments as any,
        words: allWords as any,
      },
      update: {
        text: fullText,
        language,
        segments: allSegments as any,
        words: allWords as any,
      },
    });

    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'TRANSCRIBED' },
    });

    console.log(`[transcribe] Done — ${allSegments.length} segments, ${allWords.length} words`);
    await enqueueAnalyze({ videoId });
  } finally {
    await unlink(audioLocalPath).catch(() => {});
    await execAsync(`rm -rf "${chunkDir}"`).catch(() => {});
  }
}

export function startTranscribeWorker() {
  const worker = new Worker<TranscribeJobData>(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'transcribe') await processTranscribe(job);
    },
    { connection: createRedisConnection(), concurrency: 2 }
  );

  worker.on('failed', async (job, err) => {
    console.error(`[transcribe] Job failed for video ${job?.data.videoId}:`, err.message);
    if (job?.data.videoId) {
      await prismaClientGlobal.video.update({
        where: { id: job.data.videoId },
        data: { status: 'FAILED', errorMessage: err.message },
      }).catch(() => {});
    }
  });

  return worker;
}
