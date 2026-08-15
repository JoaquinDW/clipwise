import { NextRequest, NextResponse } from 'next/server';
import { CreateVideo } from '@/domain/video/use-case';
import { getDirectUploadStorage } from '@/lib/video/storage';
import { requireBillableUser } from '@/lib/billing/guard';

const ALLOWED_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'mkv']);

/**
 * Step 1 of the upload flow: create the Video row and hand the browser a signed
 * URL it can PUT the file to directly.
 *
 * The file never touches this function — Vercel caps serverless request bodies
 * at 4.5 MB, which would reject nearly every real video.
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireBillableUser();
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const { title, description, captionStyle, fileName, fileSize } = await request.json();

    if (!title) return NextResponse.json({ error: 'No title provided' }, { status: 400 });
    if (!fileName) return NextResponse.json({ error: 'No file name provided' }, { status: 400 });

    const extension = String(fileName).split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Upload MP4, MOV, AVI or MKV.' },
        { status: 400 }
      );
    }

    const maxSizeMB = parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10);
    if (typeof fileSize === 'number' && fileSize > maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSizeMB}MB limit` },
        { status: 400 }
      );
    }

    const video = await new CreateVideo().execute({
      companyId: user.companyId,
      title,
      description: description || undefined,
      source: 'UPLOAD',
      metadata: captionStyle ? { captionStyle } : undefined,
    });

    const storage = getDirectUploadStorage();
    const signed = await storage.createSignedVideoUpload(user.companyId, video.id, extension);

    return NextResponse.json({
      success: true,
      videoId: video.id,
      uploadUrl: signed.uploadUrl,
      token: signed.token,
      path: signed.path,
      extension,
    });
  } catch (error) {
    console.error('[upload/sign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not start upload' },
      { status: 500 }
    );
  }
}
