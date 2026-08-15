import { NextRequest, NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';
import { requireUser } from '@/lib/billing/guard';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const video = await prismaClientGlobal.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      companyId: true,
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
      audioChunks: {
        select: { id: true, status: true, index: true },
        orderBy: { index: 'asc' },
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }
  if (video.companyId !== guard.user.companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const totalClips = video.clips.length;
  const readyClips = video.clips.filter((c) => c.status === 'READY').length;
  const chunksTotal = video.audioChunks?.length ?? 0;
  const chunksDone = video.audioChunks?.filter((c) => c.status === 'DONE').length ?? 0;

  // Compute overall progress percentage
  const statusWeight: Record<string, number> = {
    UPLOADING: 5,
    UPLOADED: 10,
    INGESTING: 15,
    INGESTED: 25,
    TRANSCRIBING: 40,
    TRANSCRIBED: 55,
    SCORING: 58,
    RANKING: 62,
    PROCESSING: 65,
    READY: 100,
    FAILED: 0,
  };

  let progress = statusWeight[video.status] ?? 0;
  if (video.status === 'PROCESSING' && totalClips > 0) {
    // Scale from 65 → 100 as clips complete
    progress = 65 + Math.round((readyClips / totalClips) * 35);
  }

  return NextResponse.json({
    videoId: video.id,
    status: video.status,
    progress,
    errorMessage: video.errorMessage ?? null,
    clips: video.clips,
    clipsTotal: totalClips,
    clipsReady: readyClips,
    chunksTotal,
    chunksDone,
  });
}
