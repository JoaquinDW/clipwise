import { NextRequest, NextResponse } from 'next/server';
import { RegenerateClips } from '@/domain/video/use-case';
import { prismaClientGlobal } from '@/infra/prisma';
import { enqueueAnalyze } from '@/lib/queue/queue';
import { requireBillableUser } from '@/lib/billing/guard';

/**
 * Re-run highlight detection and clip rendering for an existing transcription.
 *
 * This used to run Whisper + GPT + ffmpeg inline in the request, which cannot
 * work on Vercel: there is no ffmpeg binary and the function times out long
 * before the pipeline finishes. It now hands the work to the queue like every
 * other entry point.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

  try {
    const guard = await requireBillableUser();
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const video = await prismaClientGlobal.video.findUnique({
      where: { id: videoId },
      include: { transcription: true },
    });

    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    if (video.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!video.transcription) {
      return NextResponse.json(
        { error: 'This video has no transcription yet. Use Retry instead.' },
        { status: 400 }
      );
    }

    // Drops the existing clips and moves the video back to TRANSCRIBED
    await new RegenerateClips().execute(videoId);
    await enqueueAnalyze({ videoId });

    console.log(`[regenerate] Re-enqueued analyze for video ${videoId}`);

    return NextResponse.json({ success: true, videoId });
  } catch (error) {
    console.error('[regenerate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Regenerate failed' },
      { status: 500 }
    );
  }
}
