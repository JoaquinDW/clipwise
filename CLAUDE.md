# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clipwise is a SaaS platform that automatically converts long-form videos into short, vertical clips optimized for TikTok, YouTube Shorts, and Instagram Reels using AI. Users upload videos or paste YouTube links, and Clipwise handles transcription (OpenAI Whisper v3), highlight detection (GPT), clip generation, and caption generation.

The project is built on a Next.js boilerplate designed for solopreneurs, with Google SSO authentication, Stripe payments, and Postgres database with Prisma ORM.

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

# Build for production (includes prisma generate)
pnpm run build

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
- Stripe for payments and subscriptions
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
  /billing/              # Stripe billing & subscriptions
  /login/                # Auth pages (including /impersonate)
  /api/                  # API route handlers
    /[...nextauth]/      # NextAuth handlers
    /payment/            # Stripe checkout & webhooks
    /impersonate/        # Admin impersonation endpoint
  /ui/                   # Shared UI components
  /lib/                  # App-specific utilities

/domain                  # Domain-driven design layers
  /user/                 # User domain (entity, port, repository, use-case)
  /company/              # Company domain (entity, port, repository, use-case)

/infra                   # Infrastructure layer
  /prisma.ts             # Global Prisma client singleton
  /stripe.ts             # Stripe client wrapper
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
- `Company` - Each user gets a company (used for Stripe billing)
- `Account`, `Session`, `VerificationToken` - NextAuth adapter tables
- `PaymentTransaction` - Stores raw Stripe webhook events

**Stripe Integration:**
- Checkout sessions created via `/api/payment/checkout_sessions`
- Webhooks handled at `/api/payment/webhook` (listens for `checkout.session.completed` and `checkout.session.async_payment_succeeded`)
- Webhook stores transaction in database using `RegisterTransaction` use-case
- Customer portal URL configured in environment variables for subscription management

**Singleton Pattern:**
Global singletons are used for infrastructure clients:
- `prismaClientGlobal` in [infra/prisma.ts](infra/prisma.ts)
- `stripeInstance` in [infra/stripe.ts](infra/stripe.ts)
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
3. Highlight Detection → AI analysis with virality scoring
4. Clip Generation → FFmpeg processing (extract → crop to 9:16 → burn captions)
5. Storage → Save clips and thumbnails

**Key Design Decisions**:
- **Vercel AI SDK** for provider flexibility - Easy to swap OpenAI ↔ Anthropic
- **Structured outputs** with Zod schemas for reliable AI responses
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
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_SECRET_WEBHOOK_KEY` - Stripe keys
- `NEXT_BASE_URL` - Base URL for redirects (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_STRIPE_PORTAL_URL` - Stripe customer portal link
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
- Monthly subscriptions: Starter / Pro / Agency
- Usage tracked by processed video minutes
- Trial ends after 7 days OR limited minutes (whichever comes first)
