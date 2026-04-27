import { NextRequest, NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';
import { transcribeVideo, WordTimestamp } from '@/lib/ai/transcribe';
import { detectHighlights } from '@/lib/ai/highlights';
import { generateCaptions, captionsToASS } from '@/lib/ai/captions';
import { createClip, createClipSmart } from '@/lib/video/processor';
import { getStorageClient } from '@/lib/video/storage';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { CaptionStyleName } from '@/lib/ai/caption-styles';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

  try {
    console.log(`🚀 Starting processing for video: ${videoId}`);

    // 1. Get video
    const video = await prismaClientGlobal.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.storageUrl) {
      return NextResponse.json(
        { error: 'Video not uploaded yet' },
        { status: 400 }
      );
    }

    // Get caption style from video metadata (default to 'basic' if not set)
    const captionStyle = (video.metadata as any)?.captionStyle as CaptionStyleName | undefined;
    console.log(`🎨 Using caption style: ${captionStyle || 'basic (default)'}`);

    // 2. Transcribe video
    console.log(`🎤 Step 1: Transcribing with Whisper...`);
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'TRANSCRIBING' },
    });

    const transcription = await transcribeVideo(video.storageUrl, {
      // Let Whisper auto-detect language (remove language param for auto-detection)
      // language: 'en', // Can be set by user in future
    });

    console.log(
      `✅ Transcription complete: ${transcription.segments.length} segments, ${transcription.words.length} words`
    );

    // Save transcription with word-level timestamps
    await prismaClientGlobal.transcription.create({
      data: {
        videoId: video.id,
        text: transcription.text,
        language: transcription.language,
        segments: transcription.segments as any,
        words: transcription.words as any, // Store word-level timestamps
      },
    });

    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'TRANSCRIBED' },
    });

    // 3. Detect highlights
    console.log(`🎯 Step 2: Detecting highlights with AI...`);
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' },
    });

    const highlights = await detectHighlights(transcription.segments, {
      maxHighlights: 5,
      minDuration: 15,
      maxDuration: 60,
      targetAudience: 'TikTok, Instagram Reels, YouTube Shorts users',
      contentType: 'video content',
    });

    console.log(`✅ Found ${highlights.highlights.length} highlights`);

    // 4. Generate clips for each highlight
    console.log(`✂️  Step 3: Generating clips...`);

    const storage = getStorageClient();
    const clipsCreated = [];

    for (const [index, highlight] of highlights.highlights.entries()) {
      console.log(
        `\n  Processing highlight ${index + 1}/${highlights.highlights.length}: ${highlight.title}`
      );

      try {
        // Create clip record with crop strategy metadata
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
              cropStrategy: {
                method: highlight.cropStrategy.method,
                subjectPosition: highlight.cropStrategy.subjectPosition,
                sceneType: highlight.cropStrategy.sceneType,
                reasoning: highlight.cropStrategy.reasoning,
              },
              layoutType: highlight.layoutType ?? 'standard',
              layoutRegions: highlight.layoutRegions ?? null,
            },
          },
        });

        // Extract words for this clip (word-level timestamps)
        const clipWords = transcription.words.filter(
          (word) => word.start >= highlight.startTime && word.end <= highlight.endTime
        );

        // Adjust word times to be relative to clip start
        const adjustedWords: WordTimestamp[] = clipWords.map(
          (word) => ({
            word: word.word,
            start: word.start - highlight.startTime,
            end: word.end - highlight.startTime,
          })
        );

        // Generate captions with word-level timing (2-4 words per segment, 36px font)
        console.log(`    💬 Generating captions with word-level timing...`);
        const captions = await generateCaptions(adjustedWords, {
          maxWordsPerSegment: 3, // 2-4 words per caption
          emphasizeKeywords: true,
          includeHook: true,
          language: transcription.language, // Pass detected language to keep captions in original language
          stylePreset: captionStyle, // Apply user-selected caption style
        });

        // Download original video to temp file
        console.log(`    📥 Downloading original video...`);
        const videoResponse = await fetch(video.storageUrl);
        const videoBuffer = await videoResponse.arrayBuffer();
        const inputPath = join(tmpdir(), `input-${clip.id}.mp4`);
        await writeFile(inputPath, Buffer.from(videoBuffer));

        // Process clip with smart cropping and word-by-word captions
        console.log(`    ✂️  Processing clip with FFmpeg...`);
        const layoutType = highlight.layoutType ?? 'standard';
        console.log(`    🎬 Layout: ${layoutType} | Crop: ${highlight.cropStrategy.method} (${highlight.cropStrategy.reasoning})`);
        const outputPath = join(tmpdir(), `clip-${clip.id}.mp4`);
        await createClipSmart(
          inputPath,
          highlight.startTime,
          highlight.endTime,
          captions,
          outputPath,
          {
            cropStrategy: {
              method: highlight.cropStrategy.method,
              subjectPosition: highlight.cropStrategy.subjectPosition,
              compositeLayout: layoutType !== 'standard' && layoutType !== 'talking_head'
                ? { layoutType, layoutRegions: highlight.layoutRegions }
                : undefined,
            },
            burnCaptions: true,
            stylePreset: captionStyle,
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

        // Update clip (store complete captions result with word-level data)
        await prismaClientGlobal.clip.update({
          where: { id: clip.id },
          data: {
            storageUrl: clipUpload.url,
            status: 'READY',
            captions: captions as any, // Store full CaptionsResult with word-level timing
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

    // 5. Mark video as READY
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'READY' },
    });

    console.log(`\n🎉 Processing complete! Created ${clipsCreated.length} clips`);

    return NextResponse.json({
      success: true,
      videoId: video.id,
      clipsCreated: clipsCreated.length,
      summary: highlights.summary,
      mainTopics: highlights.mainTopics,
    });
  } catch (error) {
    console.error('Processing error:', error);

    // Mark video as FAILED
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Processing failed',
      },
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Processing failed',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
