export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';
import { enqueueIngest, enqueueAnalyze } from '@/lib/queue/queue';
import { requireBillableUser } from '@/lib/billing/guard';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

  try {
    const guard = await requireBillableUser();
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const video = await prismaClientGlobal.video.findUnique({ where: { id: videoId } });

    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    if (video.companyId !== user.companyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const transcription = await prismaClientGlobal.transcription.findUnique({ where: { videoId } });

    if (transcription) {
      // Transcription exists — skip ingest+transcribe, just re-analyze from existing transcript
      await prismaClientGlobal.$transaction([
        prismaClientGlobal.clip.deleteMany({ where: { videoId } }),
        prismaClientGlobal.video.update({
          where: { id: videoId },
          data: { status: 'TRANSCRIBED', errorMessage: null },
        }),
      ]);
      await enqueueAnalyze({ videoId });
      console.log(`[retry] Transcription exists — skipping to analyze for video ${videoId}`);
    } else {
      // No transcription — full reset from ingest
      const sourceUrl = video.sourceUrl || video.storageUrl;
      if (!sourceUrl) {
        return NextResponse.json({ error: 'No source URL available to retry' }, { status: 400 });
      }
      await prismaClientGlobal.$transaction([
        prismaClientGlobal.clip.deleteMany({ where: { videoId } }),
        prismaClientGlobal.audioChunk.deleteMany({ where: { videoId } }),
        prismaClientGlobal.video.update({
          where: { id: videoId },
          data: { status: 'UPLOADING', errorMessage: null, audioUrl: null },
        }),
      ]);
      await enqueueIngest({
        videoId,
        sourceUrl,
        source: video.source as 'YOUTUBE' | 'UPLOAD' | 'TWITCH' | 'KICK',
      });
      console.log(`[retry] Re-enqueued ingest for video ${videoId}`);
    }

    return NextResponse.json({ success: true, videoId });
  } catch (error) {
    console.error('[retry] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Retry failed' },
      { status: 500 }
    );
  }
}
