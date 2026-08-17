/**
 * Backfill thumbnails for clips generated before generateThumbnail() worked.
 *
 *   pnpm run thumbs:backfill
 *
 * A trailing .run() after fluent-ffmpeg's .screenshots() threw "No output
 * specified" on every call, and clip.worker.ts swallowed it in a non-fatal
 * catch — so every clip rendered before that fix has thumbnailUrl = null.
 *
 * Safe to re-run: the thumbnails bucket uploads with upsert, and only clips
 * still missing a thumbnail are picked up.
 */
import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '../infra/prisma';
import { generateThumbnail } from '../lib/video/processor';
import { getStorageClient } from '../lib/video/storage';

async function backfillClip(clip: {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  storageUrl: string | null;
  metadata: unknown;
  video: { companyId: string };
}): Promise<string> {
  // Prefer the 720x1280 proxy when it exists — same framing, a fraction of the bytes
  const metadata = clip.metadata as { proxyUrl?: string } | null;
  const sourceUrl = metadata?.proxyUrl ?? clip.storageUrl;
  if (!sourceUrl) throw new Error('no storageUrl or proxyUrl');

  const videoPath = join(tmpdir(), `backfill-${clip.id}.mp4`);
  const thumbPath = join(tmpdir(), `backfill-thumb-${clip.id}.jpg`);

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
    await writeFile(videoPath, Buffer.from(await res.arrayBuffer()));

    await generateThumbnail(videoPath, thumbPath, {
      timestamp: (clip.endTime - clip.startTime) / 2,
      size: '?x960',
    });

    const thumbBuffer = await readFile(thumbPath);
    const thumbArrayBuffer = thumbBuffer.buffer.slice(
      thumbBuffer.byteOffset,
      thumbBuffer.byteOffset + thumbBuffer.byteLength
    ) as ArrayBuffer;
    const thumbBlob = new Blob([thumbArrayBuffer], { type: 'image/jpeg' });

    const storage = getStorageClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (storage as any).uploadThumbnail(
      thumbBlob,
      clip.video.companyId,
      clip.videoId,
      clip.id
    );

    await prismaClientGlobal.clip.update({
      where: { id: clip.id },
      data: { thumbnailUrl: result.url },
    });

    return result.url as string;
  } finally {
    await unlink(videoPath).catch(() => {});
    await unlink(thumbPath).catch(() => {});
  }
}

async function main() {
  const clips = await prismaClientGlobal.clip.findMany({
    where: {
      status: 'READY',
      thumbnailUrl: null,
      storageUrl: { not: null },
    },
    select: {
      id: true,
      videoId: true,
      startTime: true,
      endTime: true,
      storageUrl: true,
      metadata: true,
      video: { select: { companyId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`[thumbs] ${clips.length} clips without a thumbnail`);

  let done = 0;
  let failed = 0;

  // Sequential on purpose: each clip downloads a video file, and the worker box
  // should stay usable while this runs.
  for (const clip of clips) {
    try {
      const url = await backfillClip(clip);
      done++;
      console.log(`[thumbs] ${done}/${clips.length} ${clip.id} -> ${url}`);
    } catch (err) {
      failed++;
      console.error(`[thumbs] FAILED ${clip.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[thumbs] Done: ${done} backfilled, ${failed} failed`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prismaClientGlobal.$disconnect());
