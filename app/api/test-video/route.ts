/**
 * TEST API ENDPOINT
 *
 * Este endpoint permite testear el sistema sin autenticación
 * Usa datos simulados por defecto (no llama a OpenAI)
 */

import { NextRequest, NextResponse } from 'next/server';
import { CreateVideo } from '@/domain/video/use-case';
import { prismaClientGlobal } from '@/infra/prisma';

const TEST_COMPANY_ID = 'test-company-id';
const TEST_USER_ID = 'test-user-id';

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json();

    console.log(`🧪 Running test: ${testType}`);

    switch (testType) {
      case 'transcribe':
        return await testTranscription();

      case 'highlights':
        return await testHighlights();

      case 'full':
        return await testFullPipeline();

      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Test 1: Transcripción simulada
 */
async function testTranscription() {
  const mockTranscription = {
    text: 'Hola a todos, hoy vamos a hablar sobre cómo crear videos virales para TikTok. Lo primero que necesitas saber es que el hook es fundamental. Los primeros 3 segundos determinan si la gente se queda o se va.',
    language: 'es',
    duration: 60,
    segments: [
      {
        start: 0,
        end: 3,
        text: 'Hola a todos, hoy vamos a hablar sobre cómo crear videos virales para TikTok.',
      },
      {
        start: 3,
        end: 7,
        text: 'Lo primero que necesitas saber es que el hook es fundamental.',
      },
      {
        start: 7,
        end: 12,
        text: 'Los primeros 3 segundos determinan si la gente se queda o se va.',
      },
    ],
  };

  return NextResponse.json({
    success: true,
    testType: 'transcribe',
    message: 'Transcripción simulada completada',
    transcription: mockTranscription,
    note: 'Esto es data simulada. Para tests reales, configura OPENAI_API_KEY',
  });
}

/**
 * Test 2: Detección de highlights simulada
 */
async function testHighlights() {
  const mockHighlights = {
    highlights: [
      {
        title: 'El Hook es Todo',
        description: 'Momento donde se explica la importancia del hook en videos virales',
        startTime: 3,
        endTime: 12,
        hookText: 'Los primeros 3 segundos determinan si la gente se queda',
        score: 85,
        tags: ['educational', 'hook', 'viral-tips'],
      },
      {
        title: 'Cómo Crear Videos Virales',
        description: 'Introducción sobre la creación de contenido viral',
        startTime: 0,
        endTime: 7,
        hookText: 'Hoy vamos a hablar sobre cómo crear videos virales',
        score: 75,
        tags: ['intro', 'educational'],
      },
    ],
    summary: 'Video educativo sobre creación de contenido viral para TikTok',
    mainTopics: ['hooks', 'viral content', 'TikTok strategy'],
  };

  return NextResponse.json({
    success: true,
    testType: 'highlights',
    message: 'Detección de highlights simulada completada',
    highlights: mockHighlights,
    note: 'Esto es data simulada. Para tests reales, configura OPENAI_API_KEY',
  });
}

/**
 * Test 3: Pipeline completo
 */
async function testFullPipeline() {
  // 1. Crear video de prueba
  console.log('1. Creating test video...');
  const createVideo = new CreateVideo();
  const video = await createVideo.execute({
    companyId: TEST_COMPANY_ID,
    title: 'Test Video - ' + new Date().toISOString(),
    description: 'Video de prueba para testear el sistema',
    source: 'UPLOAD',
    sourceUrl: 'https://example.com/test-video.mp4',
  });

  console.log(`✅ Video created: ${video.id}`);

  // 2. Simular transcripción
  console.log('2. Creating mock transcription...');
  const transcription = await prismaClientGlobal.transcription.create({
    data: {
      videoId: video.id,
      text: 'Transcripción de prueba del video sobre contenido viral.',
      language: 'es',
      segments: [
        { start: 0, end: 5, text: 'Hola a todos' },
        { start: 5, end: 10, text: 'Hoy vamos a hablar de videos virales' },
        { start: 10, end: 15, text: 'Lo primero es el hook' },
      ],
    },
  });

  // Actualizar estado del video
  await prismaClientGlobal.video.update({
    where: { id: video.id },
    data: { status: 'TRANSCRIBED', duration: 60 },
  });

  console.log(`✅ Transcription created: ${transcription.id}`);

  // 3. Crear clips simulados
  console.log('3. Creating mock clips...');
  const clip1 = await prismaClientGlobal.clip.create({
    data: {
      videoId: video.id,
      title: 'El Hook es Fundamental',
      description: 'Clip sobre la importancia del hook',
      startTime: 10,
      endTime: 20,
      duration: 10,
      score: 85,
      status: 'READY',
      metadata: {
        hookText: 'Lo primero es el hook',
        tags: ['educational', 'hook'],
      },
    },
  });

  const clip2 = await prismaClientGlobal.clip.create({
    data: {
      videoId: video.id,
      title: 'Introducción a Videos Virales',
      description: 'Introducción del video',
      startTime: 0,
      endTime: 10,
      duration: 10,
      score: 75,
      status: 'READY',
      metadata: {
        hookText: 'Hola a todos',
        tags: ['intro'],
      },
    },
  });

  // 4. Actualizar video a READY
  await prismaClientGlobal.video.update({
    where: { id: video.id },
    data: { status: 'READY' },
  });

  console.log(`✅ Clips created: ${clip1.id}, ${clip2.id}`);

  // 5. Obtener el video completo con relaciones
  const finalVideo = await prismaClientGlobal.video.findUnique({
    where: { id: video.id },
    include: {
      transcription: true,
      clips: true,
    },
  });

  return NextResponse.json({
    success: true,
    testType: 'full',
    message: 'Pipeline completo ejecutado con datos simulados',
    video: finalVideo,
    summary: {
      videoId: video.id,
      status: 'READY',
      transcriptionSegments: 3,
      clipsGenerated: 2,
      topClipScore: 85,
    },
    note: 'Datos guardados en tu base de datos. Puedes verlos en Prisma Studio: npx prisma studio',
  });
}
