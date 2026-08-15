import { NextRequest, NextResponse } from 'next/server';
import { CreateVideo } from '@/domain/video/use-case';
import { enqueueIngest } from '@/lib/queue/queue';
import { requireBillableUser } from '@/lib/billing/guard';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireBillableUser();
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const { url, title, description, captionStyle } = await request.json();

    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'No title provided' }, { status: 400 });

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Create video record immediately
    const createVideo = new CreateVideo();
    const video = await createVideo.execute({
      companyId: user.companyId,
      title,
      description: description || undefined,
      source: 'YOUTUBE',
      sourceUrl: url,
      metadata: captionStyle ? { captionStyle } : undefined,
    });

    // Enqueue pipeline — returns immediately, worker processes in background
    await enqueueIngest({ videoId: video.id, sourceUrl: url, source: 'YOUTUBE' });

    console.log(`[youtube] Video ${video.id} created and enqueued for processing`);

    return NextResponse.json({ success: true, videoId: video.id });
  } catch (error) {
    console.error('YouTube route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enqueue video' },
      { status: 500 }
    );
  }
}
