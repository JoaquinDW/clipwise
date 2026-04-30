import { Worker, Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '@/infra/prisma';
import { getStorageClient } from '@/lib/video/storage';
import { generateThumbnail } from '@/lib/video/processor';
import { createRedisConnection, QUEUE_NAME, enqueueTranscribe, enqueueTranscribeChunk, type IngestJobData } from '../queue';

const execAsync = promisify(exec);

async function processStreamIngest(
  videoId: string,
  sourceUrl: string,
  source: 'TWITCH' | 'KICK'
): Promise<void> {
  const CHUNK_DURATION = parseInt(process.env.STREAM_CHUNK_DURATION || '300', 10);

  // Fetch stream metadata (duration, thumbnail) without downloading
  let metadata: { duration: number; thumbnail?: string };
  try {
    const { stdout } = await execAsync(
      `yt-dlp --dump-json --no-download "${sourceUrl}"`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 60_000 }
    );
    metadata = JSON.parse(stdout);
  } catch (err: any) {
    throw new Error(
      `Failed to fetch stream metadata. VOD may be private or subscriber-only. (${err.message})`
    );
  }

  const totalDuration: number = metadata.duration;
  if (!totalDuration || totalDuration <= 0) {
    throw new Error('Could not determine stream duration. The VOD may still be live.');
  }

  await prismaClientGlobal.video.update({
    where: { id: videoId },
    data: {
      status: 'INGESTING',
      duration: Math.round(totalDuration),
      thumbnailUrl: metadata.thumbnail ?? undefined,
    },
  });

  // Delete any stale chunks from a previous retry attempt
  await prismaClientGlobal.audioChunk.deleteMany({ where: { videoId } });

  // Pre-create all AudioChunk records
  const chunkCount = Math.ceil(totalDuration / CHUNK_DURATION);
  const chunkRecords = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) =>
      prismaClientGlobal.audioChunk.create({
        data: {
          videoId,
          index: i,
          startTime: i * CHUNK_DURATION,
          endTime: Math.min((i + 1) * CHUNK_DURATION, totalDuration),
          status: 'PENDING',
        },
      })
    )
  );

  const video = await prismaClientGlobal.video.findUnique({ where: { id: videoId } });
  if (!video) throw new Error('Video not found');

  const storage = getStorageClient();

  // Download chunks sequentially; transcription jobs fire immediately per chunk
  // so transcription of chunk N runs while chunk N+1 is still downloading
  for (let i = 0; i < chunkRecords.length; i++) {
    const chunk = chunkRecords[i];
    const chunkTmpPath = join(tmpdir(), `stream-chunk-${videoId}-${i}.m4a`);

    try {
      const cmd = [
        'yt-dlp',
        `--download-sections "*${chunk.startTime}-${chunk.endTime}"`,
        '--format "bestaudio[ext=m4a]/bestaudio"',
        '--no-playlist',
        `--force-keyframes-at-cuts`,
        `-o "${chunkTmpPath}"`,
        `"${sourceUrl}"`,
      ].join(' ');

      await execAsync(cmd, { maxBuffer: 1024 * 1024 * 200, timeout: 120_000 });

      const chunkBuffer = await readFile(chunkTmpPath);
      const chunkArrayBuffer = chunkBuffer.buffer.slice(chunkBuffer.byteOffset, chunkBuffer.byteOffset + chunkBuffer.byteLength) as ArrayBuffer;
      const chunkBlob = new Blob([chunkArrayBuffer], { type: 'audio/m4a' });
      const chunkFile = new File([chunkBlob], `chunk-${i}.m4a`, { type: 'audio/m4a' });
      const uploadResult = await (storage as any).uploadAudioChunk(
        chunkFile,
        video.companyId,
        videoId,
        i
      );

      await prismaClientGlobal.audioChunk.update({
        where: { id: chunk.id },
        data: { storageUrl: uploadResult.url, status: 'UPLOADED' },
      });

      await enqueueTranscribeChunk({
        videoId,
        chunkId: chunk.id,
        chunkIndex: i,
        totalChunks: chunkCount,
      });

      console.log(`[ingest] Stream chunk ${i + 1}/${chunkCount} uploaded and enqueued for transcription`);
    } finally {
      await unlink(chunkTmpPath).catch(() => {});
    }
  }

  console.log(`[ingest] All ${chunkCount} chunks downloaded and enqueued for ${source} video ${videoId}`);
}

export async function processIngest(job: Job<IngestJobData>) {
  const { videoId, sourceUrl, source } = job.data;
  console.log(`[ingest] Starting for video ${videoId} (source: ${source})`);

  if (source === 'TWITCH' || source === 'KICK') {
    return processStreamIngest(videoId, sourceUrl, source);
  }

  await prismaClientGlobal.video.update({
    where: { id: videoId },
    data: { status: 'INGESTING' },
  });

  // Use %(ext)s so yt-dlp picks the real extension (m4a, webm, opus, etc.)
  const audioTemplate = join(tmpdir(), `audio-${videoId}.%(ext)s`);
  let audioPath = join(tmpdir(), `audio-${videoId}.m4a`); // will be updated after download

  try {
    if (source === 'YOUTUBE') {
      // Download only audio stream — much faster and smaller than full video
      const cmd = `yt-dlp --format "bestaudio[ext=m4a]/bestaudio" --no-playlist -o "${audioTemplate}" "${sourceUrl}"`;
      await execAsync(cmd, { maxBuffer: 1024 * 1024 * 50 });

      // Find the actual downloaded file (extension may differ)
      const tmpFiles = await readdir(tmpdir());
      const downloaded = tmpFiles.find(
        (f) => f.startsWith(`audio-${videoId}.`) && !f.endsWith('.part')
      );
      if (!downloaded) throw new Error('yt-dlp finished but audio file not found');
      audioPath = join(tmpdir(), downloaded);
      console.log(`[ingest] Audio downloaded: ${audioPath}`);

      // Save YouTube thumbnail URL directly — no download needed
      const ytMatch = sourceUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (ytMatch) {
        const ytThumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        await prismaClientGlobal.video.update({
          where: { id: videoId },
          data: { thumbnailUrl: ytThumbnailUrl },
        });
        console.log(`[ingest] YouTube thumbnail saved: ${ytThumbnailUrl}`);
      }
    } else {
      // For uploads: extract audio from the stored video using ffmpeg
      const video = await prismaClientGlobal.video.findUnique({ where: { id: videoId } });
      if (!video?.storageUrl) throw new Error('Upload video has no storageUrl');

      // Download the uploaded video to temp
      const videoResponse = await fetch(video.storageUrl);
      if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.status}`);
      const videoBuffer = await videoResponse.arrayBuffer();
      const tempVideoPath = join(tmpdir(), `video-${videoId}.mp4`);
      const { writeFile } = await import('fs/promises');
      await writeFile(tempVideoPath, Buffer.from(videoBuffer));

      // Extract and transcode audio to AAC (works regardless of source codec)
      await execAsync(`ffmpeg -i "${tempVideoPath}" -vn -c:a aac -b:a 128k "${audioPath}" -y`);

      // Generate thumbnail from uploaded video
      const thumbPath = join(tmpdir(), `thumb-${videoId}.jpg`);
      try {
        await generateThumbnail(tempVideoPath, thumbPath, 2);
        const thumbBuffer = await readFile(thumbPath);
        const thumbArrayBuffer = thumbBuffer.buffer.slice(thumbBuffer.byteOffset, thumbBuffer.byteOffset + thumbBuffer.byteLength) as ArrayBuffer;
        const thumbBlob = new Blob([thumbArrayBuffer], { type: 'image/jpeg' });
        const thumbStorage = getStorageClient();
        const thumbResult = await (thumbStorage as any).uploadThumbnail(thumbBlob, video.companyId, videoId);
        await prismaClientGlobal.video.update({
          where: { id: videoId },
          data: { thumbnailUrl: thumbResult.url },
        });
        console.log(`[ingest] Thumbnail generated and uploaded: ${thumbResult.url}`);
      } catch (thumbErr) {
        console.warn(`[ingest] Thumbnail generation failed (non-fatal):`, thumbErr);
      } finally {
        await unlink(thumbPath).catch(() => {});
      }

      await unlink(tempVideoPath);
      console.log(`[ingest] Audio extracted from upload: ${audioPath}`);
    }

    // Upload audio to storage
    const storage = getStorageClient();
    const video = await prismaClientGlobal.video.findUnique({ where: { id: videoId } });
    if (!video) throw new Error('Video not found');

    const ext = audioPath.split('.').pop() ?? 'm4a';
    const mimeType = ext === 'webm' ? 'audio/webm' : ext === 'opus' ? 'audio/ogg' : 'audio/m4a';
    const audioBuffer = await readFile(audioPath);
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    const audioFile = new File([audioBlob], `audio-${videoId}.${ext}`, { type: mimeType });
    const uploadResult = await (storage as any).uploadAudio(audioFile, video.companyId, videoId);

    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'INGESTED', audioUrl: uploadResult.url },
    });

    console.log(`[ingest] Audio uploaded: ${uploadResult.url}`);
    await enqueueTranscribe({ videoId });
  } finally {
    await unlink(audioPath).catch(() => {});
  }
}

export function startIngestWorker() {
  const worker = new Worker<IngestJobData>(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'ingest') await processIngest(job);
    },
    { connection: createRedisConnection(), concurrency: 3 }
  );

  worker.on('failed', async (job, err) => {
    console.error(`[ingest] Job failed for video ${job?.data.videoId}:`, err.message);
    if (job?.data.videoId) {
      await prismaClientGlobal.video.update({
        where: { id: job.data.videoId },
        data: { status: 'FAILED', errorMessage: err.message },
      }).catch(() => {});
    }
  });

  return worker;
}
