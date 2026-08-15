# bookworm (not bullseye): ships Python 3.11, and yt-dlp requires Python >= 3.10
FROM node:20-bookworm-slim

# Install ffmpeg, ca-certificates and yt-dlp (python3 is required by the yt-dlp zipapp)
RUN apt-get update \
    && apt-get install -y ffmpeg ca-certificates curl python3 --no-install-recommends \
    && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
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
