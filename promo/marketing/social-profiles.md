# Momentreel — Social Profile Kit

Use `out/brand/Avatar.png` as the profile picture everywhere. Handle to claim on all platforms: **@momentreel** (fallbacks: @momentreelapp, @getmomentreel — keep it identical across platforms).

## X / Twitter
- **Header:** `out/brand/BannerX.png`
- **Name:** Momentreel
- **Bio (160 chars):**
  > Every long video hides viral moments. Momentreel finds them, crops to 9:16, and burns captions — done in minutes. Built for podcasters & streamers. 🚀 Waitlist ↓
- **Pinned post:** the launch thread in `launch-posts.md`, with `PostSquare.png` attached.

## Reddit
- **Banner:** `out/brand/BannerReddit.png`
- **Profile bio:**
  > Building Momentreel — AI that turns podcasts & streams into TikTok/Shorts/Reels clips. Sharing the build journey.
- Reddit profile first, subreddit later (a brand subreddit with no members looks dead — wait for users).

## Instagram / TikTok
- **Bio:**
  > Long videos in. Viral clips out. ⚡
  > AI clips for TikTok · Shorts · Reels
  > ↓ Join the waitlist
- **Link:** momentreel.com (use the same UTM-tagged link everywhere: `?utm_source=instagram` etc.)

## LinkedIn (company page)
- **Tagline:** AI-powered short clips from long-form video
- **About:**
  > Momentreel turns podcasts, streams, and long videos into short vertical clips ready for TikTok, YouTube Shorts, and Instagram Reels. AI finds the most engaging moments, crops them to 9:16 with smart framing, and adds captions — no editor, no timeline, done in minutes.

## YouTube
- **Channel art:** reuse `BannerReddit.png` (fits the 2048×1152 safe area when centered; re-render at that size from Remotion Studio if YouTube becomes a priority).
- Channel purpose: post the Remotion promo (`out/momentreel-promo.mp4`) + before/after clip demos as Shorts.

## Link previews (your own site)
Add the OG image to `app/layout.tsx` (or the landing page metadata):

```ts
export const metadata = {
  openGraph: {
    images: ["/og.png"], // copy promo/out/brand/OgImage.png → public/og.png
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
}
```
