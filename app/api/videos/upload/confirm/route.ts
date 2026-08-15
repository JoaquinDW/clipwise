import { NextRequest, NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';
import { UpdateVideoMetadata } from '@/domain/video/use-case';
import { getDirectUploadStorage } from '@/lib/video/storage';
import { enqueueIngest } from '@/lib/queue/queue';
import { requireBillableUser } from '@/lib/billing/guard';

/**
 * Step 2 of the upload flow: the browser finished pushing the file to storage,
 * so verify the object is really there and start the pipeline.
 *
 * Duration is deliberately not probed here — there is no ffprobe binary on
 * Vercel; the ingest worker measures and meters it.
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireBillableUser();
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const { videoId, extension } = await request.json();
    if (!videoId) return NextResponse.json({ error: 'No videoId provided' }, { status: 400 });

    const video = await prismaClientGlobal.video.findUnique({ where: { id: videoId } });
    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    if (video.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const storage = getDirectUploadStorage();
    const ext = typeof extension === 'string' && extension ? extension : 'mp4';

    if (!(await storage.videoObjectExists(user.companyId, videoId, ext))) {
      await prismaClientGlobal.video.update({
        where: { id: videoId },
        data: { status: 'FAILED', errorMessage: 'Upload did not complete' },
      });
      return NextResponse.json({ error: 'Upload did not complete' }, { status: 400 });
    }

    const storageUrl = storage.getVideoPublicUrl(user.companyId, videoId, ext);

    await new UpdateVideoMetadata().execute({ videoId, storageUrl });

    await enqueueIngest({ videoId, sourceUrl: storageUrl, source: 'UPLOAD' });

    console.log(`[upload/confirm] Video ${videoId} confirmed and enqueued`);

    return NextResponse.json({ success: true, videoId, url: storageUrl });
  } catch (error) {
    console.error('[upload/confirm] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not confirm upload' },
      { status: 500 }
    );
  }
}
