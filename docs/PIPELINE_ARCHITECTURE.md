# Pipeline Architecture — Audio-First Async Processing

## Overview

El pipeline anterior descargaba el video completo N veces (una por cada clip) y procesaba todo de forma bloqueante en una sola request HTTP. El nuevo pipeline es incremental, asíncrono y audio-first:

- La API responde inmediatamente después de crear el job
- El procesamiento ocurre en background vía workers independientes
- Solo se descarga audio para transcribir; el video se descarga por segmento cuando ya se sabe exactamente qué clip hacer
- Los clips se generan en paralelo

---

## Stack de infraestructura

| Componente | Tecnología |
|---|---|
| Queue | BullMQ |
| Broker | Redis (local: `redis://localhost:6379`, prod: Upstash) |
| Workers | Proceso Node.js separado (`pnpm run worker`) |
| Storage | Supabase Storage (buckets: `videos`, `audio`, `clips`, `thumbnails`) |
| DB | PostgreSQL via Prisma |
| Transcripción | OpenAI Whisper API |
| Análisis | Claude AI via Vercel AI SDK |
| Video/Audio | FFmpeg + yt-dlp |

---

## Flujo completo

```
Usuario pega URL o sube archivo
        │
        ▼
[API: /api/videos/youtube  o  /api/videos/upload]
  - Crea registro Video (status: UPLOADING)
  - Encola job { type: ingest, videoId, sourceUrl, source }
  - Responde al cliente en ~100ms
        │
        ▼
[Worker: INGEST]
  status → INGESTING
  - Si YOUTUBE: yt-dlp --format bestaudio → /tmp/audio-{id}.m4a
  - Si UPLOAD:  descarga el video de Supabase → ffmpeg -vn → extrae audio
  - Sube audio a Supabase bucket "audio"
  status → INGESTED
  Encola → TRANSCRIBE
        │
        ▼
[Worker: TRANSCRIBE]
  status → TRANSCRIBING
  - Descarga audio de Supabase a /tmp
  - ffprobe → duración total
  - ffmpeg -f segment -segment_time 300 → chunks de 5 min en /tmp/chunks-{id}/
  - Promise.all → Whisper API en paralelo sobre cada chunk
    - Cada chunk retorna { segments, words } con timestamps locales
    - Se ajustan a timestamps absolutos (offset = index × 300s)
  - Merge y sort de todos los segments y words por tiempo
  - Guarda Transcription en DB
  - Guarda AudioChunk records en DB (para tracking)
  status → TRANSCRIBED
  Encola → ANALYZE
        │
        ▼
[Worker: ANALYZE]
  status → PROCESSING
  - Lee Transcription de DB
  - detectHighlights(segments) → Claude AI → top 5 candidatos
    - Cada candidato tiene: title, startTime, endTime, score, cropStrategy
  - Por cada candidato: crea Clip record (status: PENDING)
  - Promise.all → encola un job CLIP por cada clip (en paralelo)
        │
        ▼
[Workers: CLIP] × N  (concurrencia 5, todos corren al mismo tiempo)
  clip.status → GENERATING
  - Si YOUTUBE:
      yt-dlp --download-sections "*{start}-{end}" --force-keyframes-at-cuts
      → descarga solo el segmento del video
  - Si UPLOAD:
      ffmpeg -ss {start} -to {end} -i {storageUrl} -c copy
      → extrae segmento sin re-encodear
  - Filtra words de Transcription para el rango del clip
  - Ajusta timestamps a tiempo relativo (0 = inicio del clip)
  - generateCaptions(words) → Claude AI → segmentos de 2-4 palabras con énfasis
  - createClipSmart(segment, captions, cropStrategy) → FFmpeg:
      extract → smart crop 9:16 → burn captions
  - Sube clip final a Supabase bucket "clips"
  clip.status → READY
  - Si todos los clips del video están READY → video.status = READY
```

---

## Estructura de archivos

```
lib/queue/
  queue.ts                    # Instancia BullMQ + helpers enqueue*
  start-workers.ts            # Arranca los 4 workers, maneja SIGTERM/SIGINT
  workers/
    ingest.worker.ts          # Descarga audio, sube a Supabase
    transcribe.worker.ts      # Chunking + Whisper paralelo
    analyze.worker.ts         # detectHighlights, crea Clips, encola jobs
    clip.worker.ts            # yt-dlp section + FFmpeg + upload

lib/ai/
  transcribe-chunk.ts         # Whisper API para un chunk con offset absoluto
  transcribe.ts               # (legacy, para uploads directos)
  highlights.ts               # Claude AI — detecta momentos virales
  captions.ts                 # Claude AI — genera captions con timing
  caption-styles.ts           # Estilos visuales de captions

lib/video/
  processor.ts                # FFmpeg: extract, crop 9:16, burn captions
  storage.ts                  # Supabase Storage (videos, audio, clips, thumbnails)

scripts/
  worker.ts                   # Entry point del proceso worker

app/api/videos/
  youtube/route.ts            # Crea Video + encola ingest (responde ~100ms)
  upload/route.ts             # Sube video + encola ingest (responde rápido)
  [id]/
    status/route.ts           # GET — polling de progreso 0-100%
    retry/route.ts            # POST — resetea y re-encola desde ingest
    process/route.ts          # (legacy — pipeline síncrono original)

app/dashboard/videos/[id]/
  VideoStatusPoller.tsx       # Client component — polling cada 4s, router.refresh()
```

---

## Schema de DB relevante

```prisma
model Video {
  status      VideoStatus  // UPLOADING → INGESTING → INGESTED →
                           // TRANSCRIBING → TRANSCRIBED → PROCESSING → READY | FAILED
  storageUrl  String?      // URL del video original en Supabase
  audioUrl    String?      // URL del audio extraído en Supabase (nuevo)
  audioChunks AudioChunk[]
}

model AudioChunk {
  videoId    String
  index      Int          // 0-based, orden del chunk
  startTime  Float        // segundos absolutos
  endTime    Float
  storageUrl String?      // audio chunk en Supabase (si se sube)
  transcript Json?        // { segments, words } con timestamps absolutos
  status     String       // PENDING | TRANSCRIBING | DONE | FAILED
}

model Transcription {
  videoId  String   @unique
  text     String   // texto completo
  language String?
  segments Json     // [{ start, end, text }] — timestamps absolutos
  words    Json     // [{ word, start, end }] — timestamps absolutos, word-level
}

model Clip {
  status    ClipStatus  // PENDING → GENERATING → READY | FAILED
  startTime Float       // segundos en el video original
  endTime   Float
  metadata  Json        // { cropStrategy, layoutType, hookText, tags }
  captions  Json        // resultado completo de generateCaptions()
}
```

---

## Configuración de workers (concurrencia y reintentos)

| Worker | Concurrencia | Reintentos | Backoff |
|---|---|---|---|
| ingest | 3 | 3 | exponencial 5s |
| transcribe | 2 | 3 | exponencial 5s |
| analyze | 2 | 2 | fijo 3s |
| clip | 5 | 3 | exponencial 5s |

---

## Variables de entorno requeridas

```bash
REDIS_URL=redis://localhost:6379        # o Upstash en producción
AUDIO_CHUNK_DURATION=300               # segundos por chunk (default: 5 min)

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI
OPENAI_API_KEY=...                     # Whisper + opcional GPT
ANTHROPIC_API_KEY=...                  # Claude para highlights y captions
```

---

## Arranque local

```bash
# Terminal 1 — aplicación Next.js
pnpm run dev

# Terminal 2 — workers en background
pnpm run worker

# Redis debe estar corriendo
brew services start redis
```

---

## Polling de estado desde el frontend

El cliente hace `GET /api/videos/{id}/status` cada 4 segundos via `VideoStatusPoller`.

Respuesta:
```json
{
  "videoId": "...",
  "status": "PROCESSING",
  "progress": 72,
  "errorMessage": null,
  "clips": [
    { "id": "...", "status": "READY", "storageUrl": "https://..." },
    { "id": "...", "status": "GENERATING" }
  ],
  "clipsTotal": 5,
  "clipsReady": 3
}
```

El progreso se calcula así:

| Estado | Progreso |
|---|---|
| UPLOADING | 5% |
| UPLOADED | 10% |
| INGESTING | 15% |
| INGESTED | 25% |
| TRANSCRIBING | 40% |
| TRANSCRIBED | 55% |
| PROCESSING | 60% + (clips_ready / clips_total × 40%) |
| READY | 100% |

---

## Por qué audio-first

Para un video de 2 horas en YouTube:

| Enfoque | Datos descargados | Tiempo hasta primer clip |
|---|---|---|
| Anterior (download completo × N) | ~8 GB (video × 5 clips) | ~40 min |
| Nuevo (audio + secciones) | ~115 MB audio + 5 × ~30 MB segmentos | ~8 min |

El audio a 128kbps ocupa ~1 MB/min → 2 horas ≈ 120 MB.
Cada clip de 30 segundos en video MP4 720p ≈ 30 MB.
5 clips → 150 MB de video descargado en total.

**Ahorro: ~97% de bandwidth en el caso típico.**
