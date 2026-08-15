import { NextRequest, NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';
import { getStorageClient } from '@/lib/video/storage';
import { requireUser } from '@/lib/billing/guard';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const video = await prismaClientGlobal.video.findUnique({ where: { id: videoId } });

    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    if (video.companyId !== user.companyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Best-effort cleanup of storage files (Supabase only; S3 not implemented)
    try {
      const storage = getStorageClient();
      if (video.storageUrl && 'deleteVideo' in storage) {
        const match = video.storageUrl.match(/\/object\/public\/videos\/(.+)/);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (match) await (storage as any).deleteVideo(match[1]).catch(() => {});
      }
    } catch {
      // Storage cleanup is best-effort; don't block DB delete
    }

    // DB delete — Prisma cascade handles clips, transcriptions, audioChunks, processingJobs
    await prismaClientGlobal.video.delete({ where: { id: videoId } });

    console.log(`[delete] Video ${videoId} deleted`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[delete] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
