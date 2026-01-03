import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { RegenerateClips } from '@/domain/video/use-case';
import { prismaClientGlobal } from '@/infra/prisma';
import { transcribeVideo } from '@/lib/ai/transcribe';
import { detectHighlights } from '@/lib/ai/highlights';
import { generateCaptions } from '@/lib/ai/captions';
import { createClip } from '@/lib/video/processor';
import { getStorageClient } from '@/lib/video/storage';
import { TranscriptionSegment } from '@/lib/ai/transcribe';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

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

    // Get video to verify ownership
    const video = await prismaClientGlobal.video.findUnique({
      where: { id: videoId },
      include: { transcription: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Verify ownership
    if (video.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`🔄 Regenerating clips for video: ${videoId}`);

    // Use the RegenerateClips use case to prepare video
    const regenerateClips = new RegenerateClips();
    await regenerateClips.execute(videoId);

    console.log(`✅ Video prepared for regeneration (clips deleted, status reset)`);

    // Now run the clip generation pipeline (steps 3-4 from process endpoint)
    // Video should now be in TRANSCRIBED status with existing transcription

    const transcription = await prismaClientGlobal.transcription.findUnique({
      where: { videoId: video.id },
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found. Use retry instead.' },
        { status: 400 }
      );
    }

    // 1. Detect highlights
    console.log(`🎯 Step 1: Detecting highlights with AI...`);
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' },
    });

    const highlights = await detectHighlights(
      transcription.segments as TranscriptionSegment[],
      {
        maxHighlights: 5,
        minDuration: 15,
        maxDuration: 60,
        targetAudience: 'TikTok, Instagram Reels, YouTube Shorts users',
        contentType: 'video content',
      }
    );

    console.log(`✅ Found ${highlights.highlights.length} highlights`);

    // 2. Generate clips for each highlight
    console.log(`✂️  Step 2: Generating clips...`);

    const storage = getStorageClient();
    const clipsCreated = [];

    for (const [index, highlight] of highlights.highlights.entries()) {
      console.log(
        `\n  Processing highlight ${index + 1}/${highlights.highlights.length}: ${highlight.title}`
      );

      try {
        // Create clip record
        const clip = await prismaClientGlobal.clip.create({
          data: {
            videoId: video.id,
            title: highlight.title,
            description: highlight.description,
            startTime: highlight.startTime,
            endTime: highlight.endTime,
            duration: highlight.endTime - highlight.startTime,
            score: highlight.score,
            status: 'GENERATING',
            metadata: {
              hookText: highlight.hookText,
              tags: highlight.tags,
            },
          },
        });

        // Extract words for this clip
        const clipWords = (transcription.words as any[]).filter(
          (word: any) => word.start >= highlight.startTime && word.end <= highlight.endTime
        );

        // Adjust word times to be relative to clip start
        const adjustedWords = clipWords.map((word: any) => ({
          word: word.word,
          start: word.start - highlight.startTime,
          end: word.end - highlight.startTime,
        }));

        // Generate captions with word-level timing
        console.log(`    💬 Generating captions with word-level timing...`);
        const captions = await generateCaptions(adjustedWords, {
          maxWordsPerSegment: 3,
          emphasizeKeywords: true,
          includeHook: true,
          language: transcription.language || 'en',
        });

        // Download original video to temp file
        console.log(`    📥 Downloading original video...`);
        const videoResponse = await fetch(video.storageUrl!);
        const videoBuffer = await videoResponse.arrayBuffer();
        const inputPath = join(tmpdir(), `input-${clip.id}.mp4`);
        await writeFile(inputPath, Buffer.from(videoBuffer));

        // Process clip
        console.log(`    ✂️  Processing clip with FFmpeg...`);
        const outputPath = join(tmpdir(), `clip-${clip.id}.mp4`);
        await createClip(
          inputPath,
          highlight.startTime,
          highlight.endTime,
          captions,
          outputPath,
          {
            cropToVertical: true,
            burnCaptions: true,
          }
        );

        // Upload clip to storage
        console.log(`    ☁️  Uploading clip to storage...`);
        const clipBuffer = await readFile(outputPath);
        const clipBlob = new Blob([clipBuffer], { type: 'video/mp4' });
        const clipFile = new File([clipBlob], `clip-${clip.id}.mp4`, {
          type: 'video/mp4',
        });

        const clipUpload = await storage.uploadClip(
          clipFile,
          video.companyId,
          video.id,
          clip.id
        );

        // Update clip
        await prismaClientGlobal.clip.update({
          where: { id: clip.id },
          data: {
            storageUrl: clipUpload.url,
            status: 'READY',
            captions: captions as any,
          },
        });

        // Clean up temp files
        await unlink(inputPath);
        await unlink(outputPath);

        console.log(`    ✅ Clip ${index + 1} ready!`);
        clipsCreated.push(clip.id);
      } catch (error) {
        console.error(`    ❌ Error processing clip:`, error);
        // Continue with next clip
      }
    }

    // 3. Mark video as READY
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'READY' },
    });

    console.log(`\n🎉 Regeneration complete! Created ${clipsCreated.length} clips`);

    return NextResponse.json({
      success: true,
      videoId: video.id,
      clipsCreated: clipsCreated.length,
      summary: highlights.summary,
      mainTopics: highlights.mainTopics,
    });
  } catch (error) {
    console.error('Regeneration error:', error);

    // Mark video as FAILED
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: {
        status: 'FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Regeneration failed',
      },
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Regeneration failed',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
