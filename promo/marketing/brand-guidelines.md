# Momentreel — Brand Guidelines

## Logo

| File | Use for |
|---|---|
| `promo/brand/logo-mark.svg` | The mark alone, on dark backgrounds (default) |
| `promo/brand/logo-app-icon.svg` | App icon, favicon, profile pictures |
| `promo/brand/logo-mark-mono-white.svg` | Over photos/video, single-color dark contexts |
| `promo/brand/logo-mark-mono-black.svg` | Light backgrounds, print |
| `promo/brand/logo-full-dark-bg.svg` | Mark + wordmark lockup (needs Syne webfont; use PNG renders when font isn't guaranteed) |
| `promo/out/brand/Avatar.png` | 1000×1000 profile picture (all platforms) |

**The mark:** a 9:16 clip frame with a play button, flanked by two echo frames (the clip stack from the hero), plus the ✦ AI spark. It reads at small sizes — the echo frames and spark can be dropped below 24px if needed (keep just the gradient frame + play).

**Rules**
- Don't recolor the gradient or rotate the mark.
- Minimum clear space around the lockup: the width of the play triangle.
- The wordmark is always Syne ExtraBold (800), letter-spacing -0.02em, in cream `#F2EDE8` (or the brand gradient for emphasis, never both in one lockup).

## Color

| Token | Hex | Use |
|---|---|---|
| Background | `#050505` / `#0A0A0A` | Everything sits on near-black |
| Red (primary) | `#FF3B5C` | Gradient start, viral badges, accents |
| Orange | `#FF8C00` | Gradient end, secondary accents |
| Cream | `#F2EDE8` | Headlines, wordmark |
| Gray | `#AAAAAA` | Body copy on dark |

Signature gradient: `linear-gradient(135deg, #FF3B5C, #FF8C00)` — use it on key words ("viral clips"), CTAs, and the mark. Never on long text blocks.

## Typography

- **Headings:** Syne, weight 800, tight line-height (1.0–1.05), letter-spacing -0.03em
- **Body / UI:** DM Sans, 400–700
- Both are free Google Fonts.

## Voice

- **Audience:** podcasters, streamers, YouTubers, agencies — people sitting on hours of long-form content with no time to edit.
- **Tone:** confident, fast, creator-native. Short sentences. Numbers over adjectives ("done in 5 minutes", not "blazingly fast").
- **Core message:** *Every long video hides viral moments. Momentreel finds them.*
- **Taglines in rotation:**
  - Long videos in. Viral clips out.
  - Turn your content into viral clips.
  - Stop editing. Start posting.
  - Your best moments, found automatically.
- Avoid: "revolutionary", "leverage", "unleash", AI-hype filler.

## Asset inventory (rendered to `promo/out/brand/`)

| File | Size | Platform use |
|---|---|---|
| `Avatar.png` | 1000×1000 | Profile pic: X, Reddit, IG, TikTok, LinkedIn, YouTube |
| `BannerX.png` | 1500×500 | X header (content is centered; safe from avatar overlap bottom-left) |
| `BannerReddit.png` | 1920×576 | Reddit community/profile banner |
| `OgImage.png` | 1200×630 | Link previews — set as `openGraph.images` in Next.js metadata |
| `PostSquare.png` | 1080×1080 | Feed posts: X, IG, LinkedIn |
| `PostStory.png` | 1080×1920 | IG Stories, vertical shares |

Re-render any of these after edits with:
`cd promo && npx remotion still <CompositionId> out/brand/<CompositionId>.png`
Preview/tweak everything live with `pnpm run studio`.
