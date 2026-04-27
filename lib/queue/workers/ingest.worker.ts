import { Worker, Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '@/infra/prisma';
import { getStorageClient } from '@/lib/video/storage';
import { createRedisConnection, QUEUE_NAME, enqueueTranscribe, type IngestJobData } from '../queue';

const execAsync = promisify(exec);

export async function processIngest(job: Job<IngestJobData>) {
  const { videoId, sourceUrl, source } = job.data;
  console.log(`[ingest] Starting for video ${videoId}`);

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
