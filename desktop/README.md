# Momentreel Desktop

Momentreel as a desktop app. It turns long videos into vertical 9:16 shorts on
the user's own computer, and the user's own AI agent (Claude, Codex, Cursor…)
decides which moments to cut, over MCP. There is no OpenAI key, no GPU server
and no storage bill: our marginal cost per user is close to zero, which is what
makes a lifetime licence sustainable.

```
 Agent (Claude Desktop / Claude Code / Codex / Cursor)
   │  MCP: import_video, get_transcript, get_candidates, create_clips, …
   ▼
 Momentreel.app ──────────────────────────────────────────────
   main process: Engine + MCP endpoint on 127.0.0.1:47821/mcp
     yt-dlp → whisper.cpp → FFmpeg (face tracking, captions)
     library index + settings in the app data folder
     clips in ~/Movies/Momentreel
   renderer: library, clip previews, connect-your-agent, settings
 ─────────────────────────────────────────────────────────────
   │  once a day: licence check   │  every 6 h: update check
   ▼                              ▼
 licence API (ours)            downloads.momentreel.app
```

## What is shared with the web app

The pipeline is imported straight from the repo root (`@/lib/...`), not copied:
`lib/video/processor.ts` (crop strategies, composite layouts, encode settings),
`lib/video/face-track.ts`, `lib/video/ytdlp.ts`, `lib/captions/**` (presets,
layout, ASS and raster renderers), `lib/ai/scoring.ts` (heuristic shortlist)
and the highlight and caption schemas. What the desktop replaces:

| Cloud | Desktop |
| --- | --- |
| Whisper API | whisper.cpp on the machine (`src/engine/whisper.ts`) |
| GPT highlights and ranking | the user's agent over MCP (`src/mcp/server.ts`) |
| GPT caption grouping | Whisper word timings (`src/engine/captions.ts`) |
| tfjs-node face detection | tfjs WASM (`src/engine/face-detector-wasm.ts`) |
| Postgres + Supabase Storage | a JSON index and plain folders (`src/engine/library.ts`) |
| BullMQ + Redis | in-process lanes (`src/engine/jobs.ts`) |
| Polar subscriptions + minute metering | a lifetime licence (`src/license/`) |

## Develop

```bash
cd desktop
pnpm install
pnpm test           # unit tests
pnpm typecheck
pnpm dev            # build and open the Electron app
pnpm dev:engine     # engine + MCP endpoint without Electron, prints a `claude mcp add` line
```

Locally the tools resolve from PATH (`brew install ffmpeg yt-dlp whisper-cpp`),
or from `FFMPEG_PATH`, `FFPROBE_PATH`, `YTDLP_PATH` and `WHISPER_CLI_PATH`.
Unpackaged builds accept any licence key that starts with `DEV-`
(`pnpm dev:engine` needs `MOMENTREEL_LICENSE_PROVIDER=dev` for the same).
The Whisper model downloads from the app on first run, or with
`node dist/serve.js --download-model`.

## Release (macOS first, Windows ready)

```bash
pnpm fetch-binaries              # yt-dlp nightly + whisper-cli built with Metal, for this Mac's arch
pnpm fetch-binaries darwin-x64   # on an Intel Mac (or a second runner) for the x64 build
pnpm dist:mac                    # signed + notarised dmg and zip, arm64 and x64
pnpm dist:win                    # nsis installer (run fetch-binaries win32-x64 first)
```

Signing reads `CSC_LINK` / `CSC_KEY_PASSWORD`, notarisation reads `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID`. Upload `release/` contents
(including `latest-mac.yml`) to `https://downloads.momentreel.app/desktop/mac`
for auto-updates; the URL is set in `electron-builder.yml`.

## Connecting agents

The app's "Connect agent" screen writes the config for each client and backs
up the previous file:

- **Claude Desktop, Codex:** they launch MCP servers as commands, so they get
  the stdio bridge (`dist/bridge.js`) run through the app's own binary with
  `ELECTRON_RUN_AS_NODE=1`. The bridge forwards to the app and starts it if it
  is closed, so there is only ever one engine writing the library.
- **Claude Code, Cursor:** they speak HTTP, so they get the URL and token.

The endpoint listens on 127.0.0.1 only, requires the bearer token from
`settings.json`, and refuses any request that carries an `Origin` header, which
closes the route from a web page in the user's browser.

## Licences

The seller is not decided yet, so the app only talks to **our own** licence
API. Moving between Polar, Lemon Squeezy or anything else is then a server
change; installed apps never know who the seller is. The API has three POST
endpoints under `MOMENTREEL_LICENSE_API` (default
`https://momentreel.app/api/license`), all JSON:

| Endpoint | Body | Success (200) |
| --- | --- | --- |
| `/activate` | `key`, `device_id`, `device_name` | `activation_id`, `email` |
| `/validate` | `key`, `activation_id`, `device_id` | anything |
| `/deactivate` | `key`, `activation_id`, `device_id` | anything |

A 4xx with `{ "rejected": true, "error": "…" }` means the key is refused
(unknown, refunded, too many devices) and the app locks. Any other failure
counts as "could not check": the app checks at most once a day and keeps
working for 14 days without a successful check. Tiered lifetime pricing for the
website lives in `lib/lifetime-tiers.ts`.
