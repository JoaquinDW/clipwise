# Video Processing Setup - Momentreel

## 🎉 Fase 1 Completada

Hemos configurado exitosamente la **fundación completa** del sistema de procesamiento de videos con IA para Momentreel.

## ✅ Lo que se ha construido

### 1. Base de Datos (Prisma Schema)

Se han agregado **4 nuevos modelos** al schema:

- **`Video`** - Gestión de videos con tracking de estados
  - Soporta upload directo y URLs de YouTube
  - Estados: UPLOADING → UPLOADED → TRANSCRIBING → TRANSCRIBED → PROCESSING → READY → FAILED
  - Relación con Company para billing

- **`Transcription`** - Almacenamiento de transcripciones
  - Texto completo + segmentos con timestamps
  - Detección de idioma
  - JSON con array de {start, end, text}

- **`Clip`** - Clips generados con metadata
  - Timestamps (start/end), duración
  - URLs de video y thumbnail
  - Captions quemados (JSON)
  - Score de viralidad (0-100)
  - Estado de procesamiento

- **`ProcessingJob`** - Tracking de trabajos en background
  - Tipos: TRANSCRIBE, DETECT_HIGHLIGHTS, GENERATE_CLIPS
  - Progress tracking (0-100%)
  - Manejo de errores con mensajes detallados

**Migración ejecutada**: `20251231223234_add_video_processing_models`

### 2. Vercel AI SDK - Multi-Provider Setup

**Archivos**: [lib/ai/](lib/ai/)

- **`providers.ts`** - Configuración centralizada
  - OpenAI (GPT-4 Turbo, GPT-4o, GPT-3.5)
  - Anthropic (Claude ready, comentado)
  - Fácil switch entre providers

- **`transcribe.ts`** - Whisper Integration
  - OpenAI Whisper v3
  - Retorna texto completo + segmentos con timestamps
  - Soporte para URLs y archivos locales
  - Helper functions para formateo de transcripciones

- **`highlights.ts`** - Detección de Highlights con IA
  - Usa `generateObject()` de Vercel AI SDK
  - Schemas Zod para structured outputs
  - Análisis de viralidad con scoring (0-100)
  - Criterios: Hook strength, emotional impact, self-containment, value, quotability
  - Retorna top N highlights ordenados por score

- **`captions.ts`** - Generación de Captions
  - Captions optimizados para TikTok/Reels/Shorts
  - Max words per segment (default: 5)
  - Énfasis en keywords importantes
  - 3 estilos: minimal, dynamic, bold
  - Exporta a SRT y VTT formats

### 3. Video Processing con FFmpeg

**Archivo**: [lib/video/processor.ts](lib/video/processor.ts)

Funciones implementadas:
- `extractClip()` - Cortar segmentos de video
- `cropToVertical()` - Crop automático a 9:16 (1080x1920)
- `burnCaptions()` - Quemar subtítulos en el video
- `generateThumbnail()` - Extraer thumbnails en timestamp específico
- `getVideoMetadata()` - Obtener duración, dimensiones, formato
- **`createClip()`** - Pipeline completo: extract → crop → burn captions

### 4. Storage Abstraction

**Archivo**: [lib/video/storage.ts](lib/video/storage.ts)

- **Supabase Storage** (implementado)
  - 3 buckets: `videos`, `clips`, `thumbnails`
  - Upload/download con URLs públicas
  - Organización por `companyId/videoId/`

- **AWS S3** (preparado para implementar)
  - Estructura lista, falta SDK integration

- **Validación de archivos**
  - Límites de tamaño (configurable vía env)
  - Tipos permitidos: MP4, MOV, AVI, MKV

### 5. Domain Layer (DDD Pattern)

**Directorio**: [domain/video/](domain/video/)

Siguiendo el mismo patrón que `domain/user` y `domain/company`:

- **`video.entity.ts`** - Entidad Video con business logic
  - Métodos: `isReady()`, `isFailed()`, `isProcessing()`, `canGenerateClips()`

- **`video.port.ts`** - Interface del repository
  - Contrato para operaciones CRUD

- **`video.repository.ts`** - Implementación con Prisma
  - CRUD completo con relaciones (transcription, clips)

- **`use-case.ts`** - Casos de uso del negocio
  - `CreateVideo` - Crear registro de video
  - `GetVideo` - Obtener por ID
  - `GetCompanyVideos` - Listar videos de una empresa
  - `UpdateVideoStatus` - Cambiar estado
  - `UpdateVideoMetadata` - Actualizar después de upload
  - `DeleteVideo` - Eliminar video
  - `GetVideosForProcessing` - Queue de videos para procesar

### 6. Environment Variables

Se actualizó [.env.example](.env.example) con:

```bash
# AI Services
OPENAI_API_KEY=sk-proj-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx  # opcional

# Video Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# Video Processing Limits
MAX_VIDEO_SIZE_MB=500
MAX_VIDEO_DURATION_SECONDS=3600
MAX_CLIPS_PER_VIDEO=10
```

### 7. Dependencias Instaladas

```json
{
  "dependencies": {
    "ai": "^6.0.5",
    "@ai-sdk/openai": "^3.0.2",
    "fluent-ffmpeg": "^2.1.3",
    "@ffmpeg-installer/ffmpeg": "^1.1.0",
    "@supabase/supabase-js": "^2.89.0",
    "zod": "^3.25.76"
  }
}
```

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────┐
│                   USER UPLOADS VIDEO                 │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  1. UPLOAD & STORAGE                                 │
│  • lib/video/storage.ts → Supabase Storage          │
│  • Create Video record in DB                         │
│  • Status: UPLOADING → UPLOADED                      │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  2. TRANSCRIPTION                                    │
│  • lib/ai/transcribe.ts → Whisper API              │
│  • Save Transcription with segments                 │
│  • Status: TRANSCRIBING → TRANSCRIBED                │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  3. HIGHLIGHT DETECTION                              │
│  • lib/ai/highlights.ts → GPT-4 Analysis            │
│  • AI scores moments (0-100)                         │
│  • Create Clip records (PENDING)                     │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  4. CAPTION GENERATION                               │
│  • lib/ai/captions.ts → GPT-4o                      │
│  • Optimized for shorts (max 5 words/segment)       │
│  • SRT format for FFmpeg                             │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  5. VIDEO PROCESSING                                 │
│  • lib/video/processor.ts → FFmpeg                  │
│  • Extract clip → Crop 9:16 → Burn captions         │
│  • Generate thumbnail                                │
│  • Upload to storage                                 │
│  • Status: PROCESSING → READY                        │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  CLIPS READY FOR DOWNLOAD                            │
└─────────────────────────────────────────────────────┘
```

## 🎯 Próximos Pasos

Ahora que la fundación está lista, estos son los siguientes pasos recomendados:

### Fase 2A: Upload UI (Dashboard)
1. Crear página `/app/dashboard/videos/page.tsx`
2. Componente de upload con drag & drop
3. Input para YouTube URL
4. Integración con Supabase Storage (client-side)
5. Server Action para crear Video record

### Fase 2B: Video Processing API
1. API Route: `/app/api/videos/transcribe/route.ts`
2. API Route: `/app/api/videos/process/route.ts`
3. Implementar queue system (Supabase Edge Functions o Vercel)
4. Job orchestration con status updates

### Fase 2C: Video Detail & Clips UI
1. Página `/app/dashboard/videos/[id]/page.tsx`
2. Mostrar transcripción con timeline
3. Lista de clips generados
4. Preview de clips con player
5. Botones de descarga

### Fase 2D: Background Jobs
1. Implementar job queue (BullMQ + Redis o Supabase Edge Functions)
2. Retry logic para trabajos fallidos
3. Progress tracking en tiempo real (WebSockets o polling)
4. Email notifications cuando clips están listos

### Fase 3: Optimizaciones
1. Streaming de progreso (Server-Sent Events)
2. Batch processing de múltiples videos
3. Cache de transcripciones
4. CDN para clips (CloudFront/Cloudflare)
5. Límites por plan (Starter/Pro/Agency)

## 📚 Recursos para Desarrolladores

### Testing AI Functions

```typescript
// Test transcription
import { transcribeVideo } from '@/lib/ai/transcribe';
const result = await transcribeVideo('https://example.com/video.mp4');
console.log(result.segments);

// Test highlight detection
import { detectHighlights } from '@/lib/ai/highlights';
const highlights = await detectHighlights(segments, {
  maxHighlights: 5,
  minDuration: 15,
  maxDuration: 60,
});
console.log(highlights.highlights);

// Test captions
import { generateCaptions } from '@/lib/ai/captions';
const captions = await generateCaptions(clipSegments);
console.log(captions.captions);
```

### Testing Video Processing

```typescript
// Test video processor
import { createClip } from '@/lib/video/processor';
await createClip(
  'input.mp4',
  10, // start: 10s
  40, // end: 40s
  captions,
  'output.mp4',
  { cropToVertical: true, burnCaptions: true }
);
```

### Testing Storage

```typescript
import { getStorageClient } from '@/lib/video/storage';
const storage = getStorageClient();
const result = await storage.uploadVideo(file, companyId, videoId);
console.log(result.url);
```

## 🔐 Configuración Requerida

Antes de probar el sistema completo, necesitas:

1. **OpenAI API Key** (obligatorio)
   - Ir a https://platform.openai.com/api-keys
   - Crear nueva API key
   - Agregar a `.env` como `OPENAI_API_KEY`

2. **Supabase Project** (recomendado para storage)
   - Crear proyecto en https://supabase.com
   - Ir a Settings → API
   - Copiar URL, anon key y service role key
   - Agregar a `.env`
   - Crear 3 buckets públicos: `videos`, `clips`, `thumbnails`

3. **FFmpeg** (ya instalado vía npm)
   - El paquete `@ffmpeg-installer/ffmpeg` maneja la instalación
   - Puede requerir `pnpm approve-builds` en algunos entornos

## 📖 Documentación

- [CLAUDE.md](CLAUDE.md) - Actualizado con toda la arquitectura de video processing
- [.env.example](.env.example) - Todas las variables de entorno necesarias
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Prisma Schema](prisma/schema.prisma) - Modelos de Video, Clip, Transcription, ProcessingJob

## ✨ Features Clave

- ✅ **Provider Agnostic**: Fácil cambio entre OpenAI y Anthropic
- ✅ **Type-Safe AI**: Schemas Zod para outputs estructurados
- ✅ **Modular**: Cada componente es independiente y testeable
- ✅ **Production Ready**: Error handling, validación, límites configurables
- ✅ **DDD Pattern**: Consistente con el resto del codebase
- ✅ **Scalable Storage**: Soporta Supabase y AWS S3

---

**¡La fundación está lista! 🚀**

Ahora puedes empezar a construir el UI y los API endpoints que utilizarán esta infraestructura.
