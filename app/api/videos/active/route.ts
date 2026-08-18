import { NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';
import { requireUser } from '@/lib/billing/guard';
import { composeProgress } from '@/lib/video/progress';

/**
 * Every video of the caller's company that is still moving.
 *
 * Backs the polling on the video list and the dashboard overview, which are
 * server components: without this they show whatever status was true at render
 * time and stay frozen there until the user reloads by hand.
 *
 * Deliberately lighter than /api/videos/[id]/status — no clips, no chunks —
 * because it runs for every in-flight video at once.
 */
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const videos = await prismaClientGlobal.video.findMany({
    where: {
      companyId: guard.user.companyId,
      status: { notIn: ['READY', 'FAILED'] },
    },
    select: { id: true, status: true, stageProgress: true, stageDetail: true },
  });

  return NextResponse.json({
    videos: videos.map((video) => ({
      id: video.id,
      status: video.status,
      progress: composeProgress(video.status, video.stageProgress),
      stageDetail: video.stageDetail,
    })),
  });
}
