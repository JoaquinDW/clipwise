# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Momentreel is a SaaS platform that automatically converts long-form videos into short, vertical clips optimized for TikTok, YouTube Shorts, and Instagram Reels using AI. Users upload videos or paste YouTube links, and Momentreel handles transcription (OpenAI Whisper v3), highlight detection (GPT), clip generation, and caption generation.

The project is built on a Next.js boilerplate designed for solopreneurs, with Google SSO authentication, Polar payments, and Postgres database with Prisma ORM.

## Development Commands

### Setup
```bash
# Copy environment variables
cp .env.example .env
# Fill in all required environment variables before proceeding

# Install FFmpeg (required for video processing)
brew install ffmpeg  # macOS
# or
apt-get install ffmpeg  # Linux

# Install yt-dlp (required for YouTube downloads)
brew install yt-dlp  # macOS
# or
pip install yt-dlp  # Linux/macOS with pip

# Install dependencies
pnpm install

# Generate Prisma client and run migrations
npx prisma migrate dev --name init

# Start development server
pnpm run dev
# Open http://localhost:3000
```

### Database Management
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration_name>

# View database in Prisma Studio
npx prisma studio
```

### Build & Production
```bash
# Lint the codebase
pnpm run lint

# Build for production (runs prisma generate + prisma migrate deploy)
pnpm run build

# Export the pre-launch waitlist emails
pnpm run waitlist:export > waitlist.csv

# Start production server
pnpm run start
```

## Architecture

### Tech Stack

**Frontend:**
- Next.js 14 (App Router with Server Actions)
- React 19 (RC version)
- Tailwind CSS + shadcn-ui components

**Backend:**
- NextAuth v5 (beta) for authentication
- Prisma ORM with PostgreSQL (hosted on Neon)
- Polar (merchant of record) for payments and subscriptions
- Mailgun for transactional emails

**AI & Media Processing:**
- OpenAI Whisper v3 (transcription)
- OpenAI GPT (highlight detection & captions)
- FFmpeg (video processing)

### Project Structure

```
/app                     # Next.js App Router
  /(landing-page)/       # Public landing page
  /dashboard/            # Authenticated user dashboard
  /account/              # User account management
  /billing/              # Billing & subscriptions
  /login/                # Auth pages (including /impersonate)
  /api/                  # API route handlers
    /[...nextauth]/      # NextAuth handlers
    /payment/            # Polar checkout, webhook & customer portal
    /impersonate/        # Admin impersonation endpoint
  /ui/                   # Shared UI components
  /lib/                  # App-specific utilities

/domain                  # Domain-driven design layers
  /user/                 # User domain (entity, port, repository, use-case)
  /company/              # Company domain (entity, port, repository, use-case)

/infra                   # Infrastructure layer
  /prisma.ts             # Global Prisma client singleton
  /polar.ts              # Polar client wrapper
  /mailgun.ts            # Mailgun client wrapper
  /providerDetector.ts   # Service availability detection

/prisma                  # Prisma schema & migrations
  /schema.prisma         # Database schema
  /migrations/           # SQL migration files

/public                  # Static assets
```

### Key Architectural Patterns

**Domain-Driven Design (DDD):**
The codebase uses a domain layer (`/domain`) with repositories, entities, ports, and use-cases. Business logic is encapsulated in use-cases (e.g., `CreateCompany`, `GetUser`, `RegisterTransaction`, `UpdateUser`).

**Authentication Flow:**
- NextAuth v5 with JWT session strategy
- Google OAuth provider configured in [auth.ts](auth.ts)
- Custom "Impersonate" credentials provider for admin support ([auth.ts:12-32](auth.ts#L12-L32))
- On signup (`trigger === 'signUp'`), a Company is automatically created and linked to the user ([auth.config.ts:18-24](auth.config.ts#L18-L24))
- User ID is added to session for easy access throughout the app ([auth.config.ts:31-38](auth.config.ts#L31-L38))
- Middleware protects all routes except `/` (landing page) - see [middleware.ts](middleware.ts)

**Database Schema:**
- `User` - NextAuth user with optional Company relation
- `Company` - Each user gets a company; holds provider-neutral billing state (`billingProvider`, `billingCustomerId`, …), plan, trial end and `minutesUsed`
- `Account`, `Session`, `VerificationToken` - NextAuth adapter tables
- `PaymentTransaction` - Audit trail of settled payments (written from `order.paid`)

**Billing — Polar (merchant of record):**
Stripe was retired: it has no payouts to Argentina, and activating the US account would have required a US entity. Polar is the legal seller, handles VAT/sales tax, and pays out via Stripe Connect Express. The working Stripe code is archived in [legacy/stripe/](legacy/stripe/) with a README on how to revive it.

- **[lib/plans.ts](lib/plans.ts) is the single source of truth** for plans, prices, minute quotas and clip limits. Never hardcode a tier anywhere else.
- Checkout created via `/api/payment/checkout_sessions` using [infra/polar.ts](infra/polar.ts): product IDs validated against the allowlist, `allowTrial` + `trialIntervalCount: TRIAL_DAYS` on the first subscription only
- **`externalCustomerId` is the company id.** Polar is keyed off our own id, so there is no foreign customer id to store or revalidate — the class of bug where a stale customer permanently breaks checkout cannot happen
- Customer portal opened server-side via `/api/payment/portal` (a customer session by `externalCustomerId`)
- Webhooks at `/api/payment/webhook` verify the signature with `validateEvent` from `@polar-sh/sdk/webhooks` and handle `subscription.*` plus `order.paid`; unknown events are acknowledged with 200 so Polar does not retry them
- Subscription state is mirrored onto `Company` by the `SyncSubscription` use-case. **Polar and Stripe share the same status vocabulary** (`trialing`, `active`, `past_due`, `canceled`, `incomplete`, `unpaid`, `paused`), so the access gate needs no translation layer
- The `Company` billing columns are provider-neutral on purpose (`billingProvider`, `billingCustomerId`, `billingSubscriptionId`, `billingProductId`) — switching provider is a code change, not a migration
- **Sandbox and production are separate Polar instances**: tokens and product IDs from one do not exist in the other

**Billing gate & metering:**
- [lib/billing/access.ts](lib/billing/access.ts) — `getCompanyAccess()` answers "may this company process video?" and feeds the `/billing` UI
- [lib/billing/guard.ts](lib/billing/guard.ts) — `requireBillableUser()` / `requireUser()` are the only auth entry points for API routes; they return 401 / 402
- [lib/billing/metering.ts](lib/billing/metering.ts) — `meterVideoDuration()` charges minutes in the worker, where the real duration is first known. Idempotent via `Video.minutesMetered` so retries never double-bill
- `app/dashboard/layout.tsx` redirects to `/billing` without an active subscription or trial
- `SUBSCRIPTION_BYPASS_EMAILS` bypasses all of the above, at the API door and in the worker

**Uploads:**
Files never pass through a serverless function — Vercel caps request bodies at 4.5 MB. The browser calls `/api/videos/upload/sign` for a Supabase signed URL, PUTs the file directly, then calls `/api/videos/upload/confirm` to start the pipeline.

**Singleton Pattern:**
Global singletons are used for infrastructure clients:
- `prismaClientGlobal` in [infra/prisma.ts](infra/prisma.ts)
- `polar` in [infra/polar.ts](infra/polar.ts)
- `mailgunClientGlobal` in [infra/mailgun.ts](infra/mailgun.ts)

These prevent multiple client instantiations during development hot-reloading.

### Admin Features

**Impersonation:**
Admins can log in as any user for customer support:
1. Set your user ID in `.env` as `NEXT_PUBLIC_ADMIN_USER_ID`
2. Visit `/login/impersonate`
3. Enter the target user's email and ID to authenticate as them

This uses the custom Credentials provider in NextAuth.

### Video Processing Architecture (NEW)

The video processing system uses a modular architecture with clear separation of concerns:

**AI Layer** ([lib/ai/](lib/ai/)):
- `providers.ts` - Vercel AI SDK configuration with multi-provider support (OpenAI, Anthropic ready)
- `transcribe.ts` - OpenAI Whisper v3 integration for video transcription with timestamps
- `highlights.ts` - AI-powered highlight detection using structured output (Zod schemas)
- `captions.ts` - Smart caption generation optimized for short-form videos

**Video Processing** ([lib/video/](lib/video/)):
- `storage.ts` - Abstraction layer for video storage (Supabase Storage / AWS S3)
- `processor.ts` - FFmpeg operations (clip extraction, vertical crop, caption burning, thumbnails)

**Domain Layer** ([domain/video/](domain/video/)):
- `video.entity.ts` - Video domain model with business logic
- `video.port.ts` - Repository interface contract
- `video.repository.ts` - Prisma implementation
- `use-case.ts` - Business operations (CreateVideo, GetVideo, UpdateVideoStatus, etc.)

**Database Schema**:
- `Video` - Main video records with status tracking (UPLOADING → UPLOADED → TRANSCRIBING → TRANSCRIBED → PROCESSING → READY → FAILED)
- `Transcription` - Whisper transcriptions with timestamped segments (JSON)
- `Clip` - Generated clips with metadata (start/end times, captions, virality scores)
- `ProcessingJob` - Background job tracking with progress and error handling
- `Company.minutesUsed` - Tracks processed video minutes for billing

**Processing Pipeline**:
1. Upload → Storage (Supabase/S3)
2. Transcription → Whisper API with segments
3. Highlight Detection → AI analysis with virality scoring + smart crop strategy selection
4. Clip Generation → FFmpeg processing (extract → **smart AI crop to 9:16** → burn captions)
5. Storage → Save clips and thumbnails

**Smart AI Cropping (V2 Engine)**:
The system uses GPT to analyze transcription content and automatically select the optimal vertical crop strategy for each clip:
- **track_speaker**: Smooth face tracking for talking heads (zoompan filter with "heavy tripod" stabilization)
- **track_action**: Dynamic tracking for demonstrations and movement (faster zoompan response)
- **blur_sides**: Cinematic blurred letterbox for group shots/panels (preserves full width)
- **wide_shot**: Static center crop for landscapes/screen recordings (fallback)

AI determines the strategy based on transcription clues:
- Number of people speaking ("I" vs "we" vs multiple voices)
- Activity level ("I'm going to show you..." = track_action)
- Scene type (interview = track_speaker, panel = blur_sides)
- Subject position (left/center/right based on content type)

Crop strategy is stored in `Clip.metadata.cropStrategy` with reasoning for analytics.

**Key Design Decisions**:
- **Vercel AI SDK** for provider flexibility - Easy to swap OpenAI ↔ Anthropic
- **Structured outputs** with Zod schemas for reliable AI responses
- **AI-driven crop strategies** using GPT analysis (no computer vision dependencies needed)
- **Temporary file handling** in OS temp directory for FFmpeg processing
- **Domain-driven design** consistent with existing codebase patterns
- **Status-based workflows** for tracking video processing stages

### Environment Variables

Critical environment variables (see [.env.example](.env.example)):

**Authentication & Database:**
- `AUTH_SECRET` - JWT encryption key (generate with `openssl rand -base64 32`)
- `DATABASE_URL` - PostgreSQL connection string (Neon or other provider)
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` - Google OAuth credentials

**AI Services (NEW):**
- `OPENAI_API_KEY` - OpenAI API key for Whisper + GPT (required)
- `ANTHROPIC_API_KEY` - Anthropic API key (optional, for Claude models)

**Video Storage (NEW):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for storage
- Alternative: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`

**Video Processing Limits (NEW):**
- `MAX_VIDEO_SIZE_MB` - Maximum upload size (default: 500)
- `MAX_VIDEO_DURATION_SECONDS` - Maximum video duration (default: 3600)
- `MAX_CLIPS_PER_VIDEO` - Maximum clips per video (default: 10)

**Payments & Analytics:**
- `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER` (`sandbox` | `production`) - Polar credentials
- `NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID`, `NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID` - recurring monthly product IDs, must match [lib/plans.ts](lib/plans.ts)
- `SUBSCRIPTION_BYPASS_EMAILS` - comma-separated emails that skip subscription and quota checks
- `NEXT_BASE_URL` - Base URL for redirects (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` - Google Analytics tracking
- `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID` - Google Tag Manager
- `MAILGUN_API_KEY` - Mailgun API key for emails
- `NEXT_PUBLIC_ADMIN_USER_ID` - Admin user ID for impersonation

### Node Version

Requires Node.js >= 20.12.0 (see [package.json:47](package.json#L47))

### Deployment

The project is designed for Vercel deployment with automatic deployments on git push. The build command includes `prisma generate` to ensure the Prisma client is available in production.

## Business Model

- No free plan
- 7-day trial (credit card required at signup)
- Monthly subscriptions: Starter $8 (120 min/mo) / Pro $15 (300 min/mo), billed through Polar as merchant of record
- Usage tracked by processed video minutes (`Company.minutesUsed`, reset on each billing cycle)
- Trial ends after 7 days OR 30 processed minutes (whichever comes first)
