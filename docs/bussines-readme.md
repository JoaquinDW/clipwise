# Clipwise

**Clipwise** is a SaaS that automatically turns long-form videos into short, vertical clips optimized for TikTok, YouTube Shorts, and Instagram Reels using AI.

Users upload a video or paste a YouTube link, and Clipwise handles transcription, highlight detection, clip generation, and captions — all in the background.

---

## 🚀 Core Value Proposition

> Upload once. Get multiple short-form clips ready to post.

Clipwise saves creators hours of manual editing by automating:

- Highlight detection
- Vertical cropping
- Caption generation
- Short-form formatting

---

## 🧠 Key Features

- Upload video or paste YouTube URL
- Automatic transcription (Whisper)
- AI-powered highlight detection (GPT)
- Auto-generated vertical clips (9:16)
- Burned-in captions optimized for shorts
- Trial-based access with credit card required
- Subscription-based usage (minutes-based)
- Background job processing (non-blocking)

---

## 👤 Target Users

- Content creators
- Podcasters
- Coaches & educators
- Marketers & agencies
- Streamers

---

## 💰 Business Model

- No free plan
- 7-day trial OR limited minutes (whichever comes first)
- Credit card required at signup
- Monthly subscriptions (Starter / Pro / Agency)
- Usage tracked by processed video minutes

---

## 🧱 Tech Stack

### Frontend

- Next.js (App Router)
- Server Actions
- Tailwind CSS / shadcn-ui

### Backend & Infra

- Supabase
  - Auth
  - Postgres
  - Storage (videos & clips)
  - Edge Functions (background jobs)
- Stripe (subscriptions & trial handling)

### AI & Media

- OpenAI Whisper v3 (transcription)
- OpenAI GPT (highlight detection & captions)
- FFmpeg (video processing)

---

## 🗂 Project Structure

```txt
/
├─ app/                 # Next.js App Router
│  ├─ (auth)/           # Auth pages
│  ├─ dashboard/        # User dashboard
│  ├─ api/              # Route handlers
│  └─ actions/          # Server Actions
│
├─ lib/
│  ├─ supabase/         # Supabase client & helpers
│  ├─ stripe/           # Stripe helpers
│  ├─ openai/           # OpenAI clients & prompts
│  └─ ffmpeg/           # Video processing helpers
│
├─ supabase/
│  ├─ functions/        # Edge Functions (jobs)
│  └─ migrations/       # SQL migrations
│
├─ jobs/                # Background job logic
├─ prompts/             # AI prompts (highlight detection, captions)
├─ types/               # Shared TypeScript types
└─ README.md
```
