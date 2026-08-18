import { NextRequest, NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';
import { requireUser } from '@/lib/billing/guard';
import { composeProgress } from '@/lib/video/progress';

/** The slice of the clip metadata blob this endpoint surfaces. */
type ClipMetadata = {
  hookText?: string;
  cropStrategy?: { reasoning?: string };
};

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
      stageProgress: true,
      stageDetail: true,
      errorMessage: true,
      clips: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          progress: true,
          storageUrl: true,
          thumbnailUrl: true,
          score: true,
          duration: true,
          metadata: true,
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

  // While clips render, the truthful sub-progress is how far the clips
  // themselves have got — including partial credit for the ones mid-encode, so
  // the bar keeps moving between completions instead of stepping once per clip.
  const stageProgress =
    video.status === 'PROCESSING' && totalClips > 0
      ? Math.round(
        (video.clips.reduce(
          (sum, c) => sum + (c.status === 'READY' ? 100 : c.progress),
          0
        ) /
            (totalClips * 100)) *
            100
      )
      : video.stageProgress;

  // Unpacked here rather than in the client: `metadata` is an untyped Json blob
  // and its shape is a worker concern, not the UI's.
  const clips = video.clips.map(({ metadata, ...clip }) => {
    const meta = metadata as ClipMetadata | null;
    return {
      ...clip,
      hookText: meta?.hookText ?? null,
      cropReason: meta?.cropStrategy?.reasoning ?? null,
    };
  });

  return NextResponse.json({
    videoId: video.id,
    status: video.status,
    stage: video.status,
    stageProgress,
    stageDetail: video.stageDetail,
    progress: composeProgress(video.status, stageProgress),
    errorMessage: video.errorMessage ?? null,
    clips,
    clipsTotal: totalClips,
    clipsReady: readyClips,
    chunksTotal,
    chunksDone,
  });
}
