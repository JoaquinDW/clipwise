/**
 * VIDEO PROCESSING PIPELINE EXAMPLE
 *
 * Este archivo muestra cómo usar todos los módulos juntos
 * para procesar un video completo: upload → transcribe → detect → generate clips
 *
 * Este es un EJEMPLO educativo. En producción, cada paso sería un job separado
 * ejecutado en background (Supabase Edge Functions, Vercel Background Functions, etc.)
 */

import { transcribeVideo } from '../ai/transcribe';
import { detectHighlights } from '../ai/highlights';
import { generateCaptions } from '../ai/captions';
import { createClip, getVideoMetadata } from './processor';
import { getStorageClient } from './storage';
import {
  CreateVideo,
  UpdateVideoStatus,
  UpdateVideoMetadata,
} from '@/domain/video/use-case';
import { prismaClientGlobal } from '@/infra/prisma';

/**
 * EJEMPLO 1: Procesar un video completo (end-to-end)
 */
export async function processVideoComplete(params: {
  videoFile: File;
  companyId: string;
  title: string;
  description?: string;
}) {
  const { videoFile, companyId, title, description } = params;

  try {
    // ============================================
    // PASO 1: Crear registro de video
    // ============================================
    console.log('📹 Creating video record...');
    const createVideo = new CreateVideo();
    const video = await createVideo.execute({
      companyId,
      title,
      description,
      source: 'UPLOAD',
    });

    // ============================================
    // PASO 2: Upload a storage
    // ============================================
    console.log('☁️  Uploading to storage...');
    const storage = getStorageClient();
    const uploadResult = await storage.uploadVideo(videoFile, companyId, video.id);

    // Get video metadata
    const metadata = await getVideoMetadata(uploadResult.path);

    // Update video with storage info
    const updateMetadata = new UpdateVideoMetadata();
    await updateMetadata.execute({
      videoId: video.id,
      storageUrl: uploadResult.url,
      duration: Math.floor(metadata.duration),
    });

    console.log(`✅ Video uploaded: ${uploadResult.url}`);

    // ============================================
    // PASO 3: Transcribir con Whisper
    // ============================================
    console.log('🎤 Transcribing with Whisper...');
    const updateStatus = new UpdateVideoStatus();
    await updateStatus.execute(video.id, 'TRANSCRIBING');

    const transcription = await transcribeVideo(uploadResult.url, {
      language: 'es', // o 'en' según el idioma
    });

    // Guardar transcripción en DB
    await prismaClientGlobal.transcription.create({
      data: {
        videoId: video.id,
        text: transcription.text,
        language: transcription.language,
        segments: transcription.segments,
      },
    });

    await updateStatus.execute(video.id, 'TRANSCRIBED');
    console.log(`✅ Transcription complete: ${transcription.segments.length} segments`);

    // ============================================
    // PASO 4: Detectar highlights
    // ============================================
    console.log('🔍 Detecting highlights...');
    await updateStatus.execute(video.id, 'PROCESSING');

    const highlights = await detectHighlights(transcription.segments, {
      maxHighlights: 5,
      minDuration: 15,
      maxDuration: 60,
      targetAudience: 'TikTok Gen-Z',
      contentType: 'podcast',
    });

    console.log(`✅ Found ${highlights.highlights.length} highlights`);
    console.log('Summary:', highlights.summary);
    console.log('Topics:', highlights.mainTopics);

    // ============================================
    // PASO 5: Generar clips para cada highlight
    // ============================================
    console.log('✂️  Generating clips...');

    for (const [index, highlight] of highlights.highlights.entries()) {
      console.log(`\n📌 Processing highlight ${index + 1}/${highlights.highlights.length}`);
      console.log(`Title: ${highlight.title}`);
      console.log(`Score: ${highlight.score}/100`);
      console.log(`Duration: ${highlight.endTime - highlight.startTime}s`);

      // Crear registro de clip
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

      try {
        // Extraer segmentos de transcripción para este clip
        const clipSegments = transcription.segments.filter(
          (seg) => seg.start >= highlight.startTime && seg.end <= highlight.endTime
        );

        // Generar captions
        const captions = await generateCaptions(clipSegments, {
          maxWordsPerSegment: 5,
          emphasizeKeywords: true,
          style: 'dynamic',
          includeHook: true,
        });

        console.log(`  ✅ Generated ${captions.captions.length} caption segments`);

        // Procesar video (extract → crop → burn captions)
        const outputPath = `/tmp/clip-${clip.id}.mp4`;
        await createClip(
          uploadResult.path, // video original
          highlight.startTime,
          highlight.endTime,
          captions.captions,
          outputPath,
          {
            cropToVertical: true,
            burnCaptions: true,
            captionStyle: {
              fontSize: captions.style.fontSize === 'large' ? 60 : 48,
              fontColor: captions.style.color,
              position: 'bottom',
            },
          }
        );

        console.log(`  ✅ Clip processed`);

        // Upload clip a storage
        const clipFile = await fetch(`file://${outputPath}`).then((r) => r.blob());
        const clipUpload = await storage.uploadClip(
          clipFile as File,
          companyId,
          video.id,
          clip.id
        );

        console.log(`  ✅ Uploaded to storage: ${clipUpload.url}`);

        // Actualizar clip con URL
        await prismaClientGlobal.clip.update({
          where: { id: clip.id },
          data: {
            storageUrl: clipUpload.url,
            status: 'READY',
            captions: captions.captions,
          },
        });

        console.log(`  ✅ Clip ${index + 1} ready!`);
      } catch (error) {
        console.error(`  ❌ Error processing clip:`, error);
        await prismaClientGlobal.clip.update({
          where: { id: clip.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    // ============================================
    // PASO 6: Finalizar
    // ============================================
    await updateStatus.execute(video.id, 'READY');
    console.log('\n🎉 Video processing complete!');

    return {
      videoId: video.id,
      clipCount: highlights.highlights.length,
      summary: highlights.summary,
    };
  } catch (error) {
    console.error('❌ Pipeline error:', error);
    throw error;
  }
}

/**
 * EJEMPLO 2: Procesar solo un clip específico (útil para regenerar)
 */
export async function processSpecificClip(params: {
  videoId: string;
  startTime: number;
  endTime: number;
  title: string;
}) {
  const { videoId, startTime, endTime, title } = params;

  // Get video from DB
  const video = await prismaClientGlobal.video.findUnique({
    where: { id: videoId },
    include: { transcription: true },
  });

  if (!video) throw new Error('Video not found');
  if (!video.transcription) throw new Error('Video not transcribed');

  // Extract segments for this clip
  const segments = (video.transcription.segments as any[]).filter(
    (seg: any) => seg.start >= startTime && seg.end <= endTime
  );

  // Generate captions
  const captions = await generateCaptions(segments);

  // Create clip
  const outputPath = `/tmp/clip-${Date.now()}.mp4`;
  await createClip(video.storageUrl!, startTime, endTime, captions.captions, outputPath);

  console.log('✅ Clip created:', outputPath);

  return { outputPath, captions };
}

/**
 * EJEMPLO 3: Solo transcribir un video
 */
export async function transcribeOnly(videoUrl: string) {
  console.log('🎤 Transcribing video...');

  const result = await transcribeVideo(videoUrl);

  console.log(`✅ Transcription complete`);
  console.log(`Language: ${result.language}`);
  console.log(`Duration: ${result.duration}s`);
  console.log(`Segments: ${result.segments.length}`);
  console.log(`\nFirst 3 segments:`);

  result.segments.slice(0, 3).forEach((seg, i) => {
    console.log(`${i + 1}. [${seg.start}s - ${seg.end}s] ${seg.text}`);
  });

  return result;
}

/**
 * EJEMPLO 4: Solo detectar highlights (sin generar clips)
 */
export async function detectHighlightsOnly(videoId: string) {
  const video = await prismaClientGlobal.video.findUnique({
    where: { id: videoId },
    include: { transcription: true },
  });

  if (!video?.transcription) {
    throw new Error('Video must be transcribed first');
  }

  const segments = video.transcription.segments as any[];
  const highlights = await detectHighlights(segments);

  console.log(`\n🎯 Detected ${highlights.highlights.length} highlights:\n`);

  highlights.highlights.forEach((h, i) => {
    console.log(`${i + 1}. ${h.title} (Score: ${h.score}/100)`);
    console.log(`   ${h.startTime}s - ${h.endTime}s`);
    console.log(`   Hook: "${h.hookText}"`);
    console.log(`   Tags: ${h.tags.join(', ')}\n`);
  });

  return highlights;
}
