# bookworm (not bullseye): ships Python 3.11, and yt-dlp requires Python >= 3.10
#
# node 22, not 20: yt-dlp's EJS solver rejects node 20 as an unsupported JS runtime
# ("JS runtimes: node-20.20.2 (unsupported)"), and node is the only runtime this
# image has. See the --js-runtimes flag in lib/video/ytdlp.ts.
FROM node:22-bookworm-slim

# Install ffmpeg, ca-certificates and yt-dlp (python3 is required by the yt-dlp zipapp)
#
# yt-dlp comes from the *nightly* channel, not stable. YouTube rotates its player
# clients faster than yt-dlp cuts stable releases (~monthly), and a stale build does
# not degrade gracefully: on 2026-08-18 stable 2026.07.04 fell back to the android_vr
# client, whose media URLs YouTube answers with `HTTP Error 403: Forbidden`, and every
# YouTube ingest failed. The nightly of that same day extracted the identical video
# through a new `visionos` client without incident. Rebuild this image periodically —
# pinning it is how the 403 comes back.
#
# fontconfig is for diagnosis only (fc-list/fc-scan): captions do NOT go through
# it. The bundled @ffmpeg-installer binary is built without --enable-fontconfig,
# so libass reads fonts straight out of the `fontsdir` the filter is given, and
# those ship in public/fonts/captions/ via the COPY below.
RUN apt-get update \
    && apt-get install -y ffmpeg ca-certificates curl python3 fontconfig --no-install-recommends \
    && curl -fsSL https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install PNPM and project dependencies (include dev deps so tsx is available)
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy project files
COPY . .

# Generate prisma client if present (no-op if not configured)
RUN pnpm prisma generate || true

ENV NODE_ENV=production

# Run the worker entry (worker:prod reads env vars from the container, not from a .env file)
CMD ["pnpm", "run", "worker:prod"]
