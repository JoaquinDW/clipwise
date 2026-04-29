FROM node:20-bullseye-slim

# Install ffmpeg and ca-certificates
RUN apt-get update && apt-get install -y ffmpeg ca-certificates --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install PNPM and project dependencies (include dev deps so tsx is available)
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy project files
COPY . .

# Generate prisma client if present (no-op if not configured)
RUN pnpm prisma generate || true

ENV NODE_ENV=production

# Run the worker entry (uses the `worker` script from package.json)
CMD ["pnpm", "run", "worker"]
