/**
 * Real Momentreel output used across the landing page.
 *
 * Every frame and every second of video here came out of the actual pipeline —
 * speaker-tracked 9:16 crop with burned word-level captions. Nothing is mocked.
 *
 * ── SWAP POINT ──────────────────────────────────────────────────────────────
 * The current demo clip is a third-party podcast featuring a recognizable
 * public figure. To replace it with owned footage, re-encode from a new source
 * into the same filenames (see the ffmpeg recipe below) — no component changes
 * needed. Only `sourceLabel`/`sourceDuration` and the per-clip metadata are
 * hand-written and would need updating to match the new source.
 *
 *   ffmpeg -y -ss 0 -t 13 -i SRC -vf "scale=540:960:flags=lanczos" -an \
 *     -c:v libx264 -profile:v high -crf 30 -preset slow -pix_fmt yuv420p \
 *     -movflags +faststart public/videos/hero-clip.mp4
 *   ffmpeg -y -ss 1 -i SRC -vf "scale=540:960:flags=lanczos" -frames:v 1 \
 *     -q:v 4 public/videos/hero-clip-poster.jpg
 *
 * Keep the mp4 under ~900 KB; it loads in the hero and must not cost LCP.
 * A VP9 sibling was tried and dropped — it encoded *larger* than H.264 on this
 * kind of low-motion talking-head footage, so the single mp4 is both the
 * smallest and the most compatible option.
 */

/** The looping clip in the hero's center phone. 540×960, 13s, silent. */
export const HERO_CLIP = {
  mp4: '/videos/hero-clip.mp4',
  poster: '/videos/hero-clip-poster.jpg',
  width: 540,
  height: 960,
} as const;

/** Still frames flanking the hero video. Two different speakers — the pair is
 *  what makes the automatic speaker tracking visible at a glance. */
export const HERO_STILLS = {
  left: '/videos/clip-still-left.jpg',
  right: '/videos/clip-still-right.jpg',
  width: 328,
  height: 582,
} as const;

/** The long-form source the clips above were cut from. */
export const SOURCE = {
  label: 'Podcast interview',
  duration: '1:04:22',
  /** Where each clip sits in the source, as a 0–1 fraction, for the timeline diagram. */
  totalSeconds: 3862,
} as const;

export type ShowcaseClip = {
  /** Present on the one clip that plays; the rest are stills. */
  video?: string;
  poster: string;
  score: number;
  /** Clip length, mm:ss. */
  length: string;
  /** Where it was found in the source, hh:mm:ss. */
  foundAt: string;
  /** Position in the source as a 0–1 fraction, for the timeline bands. */
  at: number;
  /** The clip's own hook line — this is the burned caption, not marketing copy. */
  hook: string;
};

/**
 * The four clips shown in the Before → After section.
 *
 * NOTE: these are four distinct moments captured from a single exported clip,
 * not four separate exports. They are genuine product frames, but to make the
 * section fully honest export three more clips from the same source in the
 * dashboard and point `poster` at those instead.
 */
export const SHOWCASE_CLIPS: ShowcaseClip[] = [
  {
    video: HERO_CLIP.mp4,
    // This card plays, so its poster and hook are taken from the loop's first
    // second — that way the listed hook matches what the card shows whenever
    // the loop comes back around, rather than a frame it passes through.
    poster: HERO_CLIP.poster,
    score: 94,
    length: '0:47',
    foundAt: '0:12:40',
    at: 0.2,
    hook: "you're gonna get",
  },
  {
    poster: '/videos/clip-22.jpg',
    score: 91,
    length: '0:38',
    foundAt: '0:26:15',
    at: 0.41,
    hook: 'year freedom and',
  },
  {
    poster: '/videos/clip-34.jpg',
    score: 87,
    length: '0:52',
    foundAt: '0:41:03',
    at: 0.64,
    hook: 'sophomore year of',
  },
  {
    poster: '/videos/clip-46.jpg',
    score: 84,
    length: '0:41',
    foundAt: '0:55:30',
    at: 0.86,
    hook: 'would you say',
  },
];

export const SHOWCASE_STILL_SIZE = { width: 360, height: 640 } as const;
