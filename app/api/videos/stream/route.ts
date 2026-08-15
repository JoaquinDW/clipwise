import { NextRequest, NextResponse } from 'next/server';
import { CreateVideo } from '@/domain/video/use-case';
import { enqueueIngest } from '@/lib/queue/queue';
import { requireBillableUser } from '@/lib/billing/guard';
import {
  detectPlatform,
  validateTwitchVodUrl,
  validateKickVodUrl,
} from '@/lib/video/platform-detector';
import type { VideoSource } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireBillableUser();
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const { url, title, description, captionStyle } = await request.json();

    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'No title provided' }, { status: 400 });

    const platform = detectPlatform(url);

    let source: VideoSource;
    if (platform === 'twitch') {
      if (!validateTwitchVodUrl(url)) {
        return NextResponse.json(
          { error: 'Invalid Twitch URL. Paste a VOD URL: twitch.tv/videos/{id}' },
          { status: 400 }
        );
      }
      source = 'TWITCH';
    } else if (platform === 'kick') {
      if (!validateKickVodUrl(url)) {
        return NextResponse.json(
          { error: 'Invalid Kick URL. Paste a VOD URL: kick.com/{channel}/video/{id}' },
          { status: 400 }
        );
      }
      source = 'KICK';
    } else {
      return NextResponse.json(
        { error: 'Unsupported platform. Paste a Twitch or Kick VOD URL.' },
        { status: 400 }
      );
    }

    const createVideo = new CreateVideo();
    const video = await createVideo.execute({
      companyId: user.companyId,
      title,
      description: description || undefined,
      source,
      sourceUrl: url,
      metadata: captionStyle ? { captionStyle } : undefined,
    });

    await enqueueIngest({ videoId: video.id, sourceUrl: url, source });

    console.log(`[stream] Video ${video.id} created (${source}) and enqueued`);

    return NextResponse.json({ success: true, videoId: video.id });
  } catch (error) {
    console.error('[stream] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process stream URL' },
      { status: 500 }
    );
  }
}
