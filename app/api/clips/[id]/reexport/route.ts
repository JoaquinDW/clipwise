import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prismaClientGlobal } from '@/infra/prisma';
import { enqueueClip } from '@/lib/queue/queue';
import { isValidCaptionStyleName } from '@/lib/ai/caption-styles';

const VALID_POSITIONS = new Set(['top', 'center', 'bottom']);
const VALID_SIZES = new Set(['small', 'medium', 'large']);

const MAX_DELTA_SECONDS = 15;
const MIN_DURATION = 10;
const MAX_DURATION = 90;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const clipId = params.id;

  try {
    const session = await auth();
    const userId = session?.user?.id || 'test-user-id';

    const user = await prismaClientGlobal.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user?.companyId) {
      return NextResponse.json({ error: 'User has no company' }, { status: 400 });
    }

    const clip = await prismaClientGlobal.clip.findUnique({
      where: { id: clipId },
      include: { video: { select: { companyId: true } } },
    });

    if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    if (clip.video.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (clip.status !== 'READY') {
      return NextResponse.json({ error: 'Clip is not ready for editing' }, { status: 400 });
    }

    const body = await request.json();
    const deltaStart: number = body.deltaStart ?? 0;
    const deltaEnd: number = body.deltaEnd ?? 0;
    const captionStyle: string | undefined = body.captionStyle ?? undefined;
    const captionPosition: string | undefined = body.captionPosition ?? undefined;
    const captionSize: string | undefined = body.captionSize ?? undefined;

    if (Math.abs(deltaStart) > MAX_DELTA_SECONDS || Math.abs(deltaEnd) > MAX_DELTA_SECONDS) {
      return NextResponse.json(
        { error: `Adjustments must be within ±${MAX_DELTA_SECONDS} seconds` },
        { status: 422 }
      );
    }

    const newStart = clip.startTime + deltaStart;
    const newEnd = clip.endTime + deltaEnd;
    const newDuration = newEnd - newStart;

    if (newDuration < MIN_DURATION || newDuration > MAX_DURATION) {
      return NextResponse.json(
        { error: `Clip duration must be between ${MIN_DURATION}s and ${MAX_DURATION}s` },
        { status: 422 }
      );
    }

    if (newStart < 0) {
      return NextResponse.json({ error: 'Start time cannot be negative' }, { status: 422 });
    }

    if (captionStyle !== undefined && !isValidCaptionStyleName(captionStyle)) {
      return NextResponse.json({ error: `Unknown caption style: ${captionStyle}` }, { status: 422 });
    }
    if (captionPosition !== undefined && !VALID_POSITIONS.has(captionPosition)) {
      return NextResponse.json({ error: `Invalid caption position: ${captionPosition}` }, { status: 422 });
    }
    if (captionSize !== undefined && !VALID_SIZES.has(captionSize)) {
      return NextResponse.json({ error: `Invalid caption size: ${captionSize}` }, { status: 422 });
    }

    const baseMetadata = (clip.metadata as Record<string, unknown>) ?? {};
    // Strip the proxyUrl from parent — the new clip will get its own proxy after rendering
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { proxyUrl: _proxyUrl, ...inheritedMetadata } = baseMetadata;

    const newClip = await prismaClientGlobal.clip.create({
      data: {
        videoId: clip.videoId,
        title: clip.title,
        description: clip.description,
        startTime: newStart,
        endTime: newEnd,
        duration: newDuration,
        score: clip.score,
        metadata: {
          ...inheritedMetadata,
          ...(captionStyle !== undefined && { captionStyle }),
          ...(captionPosition !== undefined && { captionPosition }),
          ...(captionSize !== undefined && { captionSize }),
          burnCaptions: true,
        },
        parentClipId: clip.id,
        originalStart: clip.startTime,
        originalEnd: clip.endTime,
        status: 'PENDING',
      },
    });

    await enqueueClip({ videoId: clip.videoId, clipId: newClip.id });

    console.log(`[reexport] Clip ${clip.id} → new clip ${newClip.id} (delta: ${deltaStart}s/${deltaEnd}s)`);

    return NextResponse.json({ clipId: newClip.id });
  } catch (error) {
    console.error('[reexport] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Re-export failed' },
      { status: 500 }
    );
  }
}
