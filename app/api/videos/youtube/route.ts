import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CreateVideo, UpdateVideoMetadata } from '@/domain/video/use-case';
import { getStorageClient } from '@/lib/video/storage';
import { getVideoMetadata } from '@/lib/video/processor';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { prismaClientGlobal } from '@/infra/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

    // Parse request body
    const { url, title, description } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'No title provided' }, { status: 400 });
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`📺 Downloading YouTube video: ${url}`);

    // 1. Create video record
    const createVideo = new CreateVideo();
    const video = await createVideo.execute({
      companyId: user.companyId,
      title,
      description: description || undefined,
      source: 'YOUTUBE',
      sourceUrl: url,
    });

    console.log(`✅ Video record created: ${video.id}`);

    try {
      // 2. Download video from YouTube using yt-dlp
      const tempPath = join(tmpdir(), `youtube-${Date.now()}.mp4`);

      console.log(`🔄 Starting download with yt-dlp...`);

      // Use yt-dlp to download the video
      // -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' = best quality MP4
      // --merge-output-format mp4 = ensure output is MP4
      // -o = output path
      const command = `yt-dlp -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' --merge-output-format mp4 -o "${tempPath}" "${url}"`;

      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('Deleting original file')) {
        console.warn('yt-dlp stderr:', stderr);
      }

      console.log(`💾 Video downloaded to: ${tempPath}`);

      // 3. Extract video metadata
      let metadata;
      try {
        metadata = await getVideoMetadata(tempPath);
        console.log(`📊 Metadata extracted:`, metadata);
      } catch (metadataError) {
        console.error('Failed to extract metadata:', metadataError);
        metadata = {
          duration: 0,
          width: 0,
          height: 0,
          format: 'unknown',
          bitrate: 0,
        };
      }

      // 3.5. Compress video if needed (reduce file size for Supabase limits)
      const compressedPath = join(tmpdir(), `youtube-compressed-${Date.now()}.mp4`);
      console.log(`🔄 Compressing video to reduce file size...`);

      // Limit duration for testing (first 3 minutes max) and compress
      // -t 180 = first 180 seconds (3 minutes)
      // Scale to 720p max, CRF 28 (good quality/size balance)
      const maxDuration = process.env.YOUTUBE_MAX_DURATION || '180'; // 3 minutes default
      const compressCommand = `ffmpeg -i "${tempPath}" -t ${maxDuration} -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease" -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 128k "${compressedPath}"`;
      await execAsync(compressCommand, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer for FFmpeg output

      // Delete original, use compressed
      await unlink(tempPath);
      const finalPath = compressedPath;

      console.log(`✅ Video compressed successfully`);

      // 4. Upload to Supabase Storage
      const storage = getStorageClient();

      // Read file as buffer
      const buffer = await readFile(finalPath);
      const file = new File([buffer], `${video.id}.mp4`, { type: 'video/mp4' });

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
      await unlink(finalPath);
      console.log(`🗑️  Temp file cleaned up`);

      return NextResponse.json({
        success: true,
        videoId: video.id,
        url: uploadResult.url,
        duration: Math.floor(metadata.duration),
      });
    } catch (error) {
      // If download/processing fails, mark video as FAILED
      await prismaClientGlobal.video.update({
        where: { id: video.id },
        data: {
          status: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'YouTube download failed',
        },
      });

      throw error;
    }
  } catch (error) {
    console.error('YouTube download error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'YouTube download failed',
      },
      { status: 500 }
    );
  }
}
