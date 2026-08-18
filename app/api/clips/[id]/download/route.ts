import { NextRequest, NextResponse } from 'next/server';
import { prismaClientGlobal } from '@/infra/prisma';
import { requireUser } from '@/lib/billing/guard';
import { getStorageClient } from '@/lib/video/storage';

/** A filename the OS will accept, derived from the clip's title. */
function toFileName(title: string, clipId: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return `${slug || `clip-${clipId}`}.mp4`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const clipId = params.id;

  try {
    // Auth-only: handing back a file that is already rendered spends no compute,
    // so a lapsed subscription should not block it.
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const clip = await prismaClientGlobal.clip.findUnique({
      where: { id: clipId },
      include: { video: { select: { id: true, companyId: true } } },
    });

    if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    if (clip.video.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (clip.status !== 'READY' || !clip.storageUrl) {
      return NextResponse.json({ error: 'Clip is not ready yet' }, { status: 409 });
    }

    const storage = getStorageClient();
    const signedUrl = await storage.createClipDownloadUrl(
      clip.video.companyId,
      clip.videoId,
      clip.id,
      toFileName(clip.title, clip.id)
    );

    // Returned rather than redirected to: the caller can surface a failure
    // inline instead of navigating the editor away to an error page. The URL
    // carries Content-Disposition: attachment, so opening it saves the file.
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('[clip-download] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}
