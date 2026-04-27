import { NextRequest, NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

  const video = await prismaClientGlobal.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      status: true,
      errorMessage: true,
      clips: {
        select: {
          id: true,
          title: true,
          status: true,
          storageUrl: true,
          score: true,
          duration: true,
        },
        orderBy: { score: 'desc' },
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const totalClips = video.clips.length;
  const readyClips = video.clips.filter((c) => c.status === 'READY').length;

  // Compute overall progress percentage
  const statusWeight: Record<string, number> = {
    UPLOADING: 5,
    UPLOADED: 10,
    INGESTING: 15,
    INGESTED: 25,
    TRANSCRIBING: 40,
    TRANSCRIBED: 55,
    PROCESSING: 60,
    READY: 100,
    FAILED: 0,
  };

  let progress = statusWeight[video.status] ?? 0;
  if (video.status === 'PROCESSING' && totalClips > 0) {
    // Scale from 60 → 100 as clips complete
    progress = 60 + Math.round((readyClips / totalClips) * 40);
  }

  return NextResponse.json({
    videoId: video.id,
    status: video.status,
    progress,
    errorMessage: video.errorMessage ?? null,
    clips: video.clips,
    clipsTotal: totalClips,
    clipsReady: readyClips,
  });
}
