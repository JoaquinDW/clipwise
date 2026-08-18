import { NextRequest, NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';
import { requireUser } from '@/lib/billing/guard';

/**
 * Progress signal for a single clip render.
 *
 * /api/videos/[id]/status cannot serve this: the dashboard poller stops once
 * the video is READY, and a render triggered from the editor never moves the
 * video off READY. Polling one clip keeps the rest of the page still.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const clipId = params.id;

  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const clip = await prismaClientGlobal.clip.findUnique({
    where: { id: clipId },
    select: {
      id: true,
      status: true,
      storageUrl: true,
      errorMessage: true,
      video: { select: { companyId: true } },
    },
  });

  if (!clip) {
    return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
  }
  if (clip.video.companyId !== guard.user.companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    id: clip.id,
    status: clip.status,
    storageUrl: clip.storageUrl ?? null,
    errorMessage: clip.errorMessage ?? null,
  });
}
