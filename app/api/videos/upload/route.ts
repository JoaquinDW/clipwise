import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CreateVideo, UpdateVideoMetadata } from '@/domain/video/use-case';
import { getStorageClient } from '@/lib/video/storage';
import { getVideoMetadata } from '@/lib/video/processor';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '@/infra/prisma';
import { enqueueIngest } from '@/lib/queue/queue';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'test-user-id';

    const user = await prismaClientGlobal.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user?.companyId) {
      return NextResponse.json({ error: 'User has no company' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const captionStyle = formData.get('captionStyle') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'No title provided' }, { status: 400 });

    console.log(`[upload] Uploading video: ${title} (${file.size} bytes)`);

    const createVideo = new CreateVideo();
    const video = await createVideo.execute({
      companyId: user.companyId,
      title,
      description: description || undefined,
      source: 'UPLOAD',
      metadata: captionStyle ? { captionStyle } : undefined,
    });

    try {
      // Save temp to extract metadata before upload
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const tempPath = join(tmpdir(), `upload-${video.id}.mp4`);
      await writeFile(tempPath, buffer);

      let duration = 0;
      try {
        const metadata = await getVideoMetadata(tempPath);
        duration = Math.floor(metadata.duration);
      } catch {
        console.warn('[upload] Could not extract metadata, continuing without duration');
      }

      // Upload original video to storage (worker will extract audio from this URL)
      const storage = getStorageClient();
      const uploadResult = await storage.uploadVideo(file, user.companyId, video.id);
      await unlink(tempPath).catch(() => {});

      const updateMetadata = new UpdateVideoMetadata();
      await updateMetadata.execute({ videoId: video.id, storageUrl: uploadResult.url, duration });

      // Enqueue pipeline — audio extraction happens in the ingest worker
      await enqueueIngest({ videoId: video.id, sourceUrl: uploadResult.url, source: 'UPLOAD' });

      console.log(`[upload] Video ${video.id} uploaded and enqueued`);

      return NextResponse.json({ success: true, videoId: video.id, url: uploadResult.url, duration });
    } catch (error) {
      await prismaClientGlobal.video.update({
        where: { id: video.id },
        data: { status: 'FAILED', errorMessage: error instanceof Error ? error.message : 'Upload failed' },
      });
      throw error;
    }
  } catch (error) {
    console.error('[upload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
