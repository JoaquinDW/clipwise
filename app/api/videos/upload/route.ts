import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CreateVideo, UpdateVideoMetadata } from '@/domain/video/use-case';
import { getStorageClient } from '@/lib/video/storage';
import { getVideoMetadata } from '@/lib/video/processor';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '@/infra/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get session (or use test user)
    const session = await auth();
    const userId = session?.user?.id || 'test-user-id';

    // Get user's company
    const user = await prismaClientGlobal.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user?.companyId) {
      return NextResponse.json(
        { error: 'User has no company' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'No title provided' }, { status: 400 });
    }

    console.log(`📤 Uploading video: ${title} (${file.size} bytes)`);

    // 1. Create video record
    const createVideo = new CreateVideo();
    const video = await createVideo.execute({
      companyId: user.companyId,
      title,
      description: description || undefined,
      source: 'UPLOAD',
    });

    console.log(`✅ Video record created: ${video.id}`);

    try {
      // 2. Save file temporarily to extract metadata
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const tempPath = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
      await writeFile(tempPath, buffer);

      console.log(`💾 Temp file saved: ${tempPath}`);

      // 3. Extract video metadata
      let metadata;
      try {
        metadata = await getVideoMetadata(tempPath);
        console.log(`📊 Metadata extracted:`, metadata);
      } catch (metadataError) {
        console.error('Failed to extract metadata:', metadataError);
        // Continue without metadata
        metadata = { duration: 0, width: 0, height: 0, format: 'unknown', bitrate: 0 };
      }

      // 4. Upload to Supabase Storage
      const storage = getStorageClient();
      const uploadResult = await storage.uploadVideo(
        file,
        user.companyId,
        video.id
      );

      console.log(`☁️  Uploaded to storage: ${uploadResult.url}`);

      // 5. Update video with storage URL and metadata
      const updateMetadata = new UpdateVideoMetadata();
      await updateMetadata.execute({
        videoId: video.id,
        storageUrl: uploadResult.url,
        duration: Math.floor(metadata.duration),
      });

      // Clean up temp file
      await unlink(tempPath);
      console.log(`🗑️  Temp file cleaned up`);

      return NextResponse.json({
        success: true,
        videoId: video.id,
        url: uploadResult.url,
        duration: Math.floor(metadata.duration),
      });
    } catch (error) {
      // If upload/processing fails, mark video as FAILED
      await prismaClientGlobal.video.update({
        where: { id: video.id },
        data: {
          status: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'Upload failed',
        },
      });

      throw error;
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
