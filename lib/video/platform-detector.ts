export type Platform = 'youtube' | 'twitch' | 'kick' | null;

export function detectPlatform(url: string): Platform {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'youtu.be') return 'youtube';
    if (host === 'twitch.tv') return 'twitch';
    if (host === 'kick.com') return 'kick';
    return null;
  } catch {
    return null;
  }
}

// Valid Twitch VOD: twitch.tv/videos/{id}
export function validateTwitchVodUrl(url: string): boolean {
  return /twitch\.tv\/videos\/\d+/.test(url);
}

// Valid Kick VOD: kick.com/{channel}/video/{id}
export function validateKickVodUrl(url: string): boolean {
  return /kick\.com\/[^/]+\/video\/[^/]+/.test(url);
}

export function getTwitchVodId(url: string): string | null {
  const match = url.match(/twitch\.tv\/videos\/(\d+)/);
  return match?.[1] ?? null;
}

export function getKickVodId(url: string): { channel: string; videoId: string } | null {
  const match = url.match(/kick\.com\/([^/]+)\/video\/([^/?#]+)/);
  if (!match) return null;
  return { channel: match[1], videoId: match[2] };
}

export function isSupportedStreamUrl(url: string): boolean {
  const platform = detectPlatform(url);
  if (platform === 'twitch') return validateTwitchVodUrl(url);
  if (platform === 'kick') return validateKickVodUrl(url);
  return false;
}
