# Quick Start - Clipwise Video Processing

## 🚀 Setup Rápido (5 minutos)

### 1. Variables de Entorno

Copia y completa las nuevas variables en tu `.env`:

```bash
# AI Services (REQUERIDO)
OPENAI_API_KEY=sk-proj-xxxxx  # Obtén en https://platform.openai.com/api-keys

# Video Storage - Opción A: Supabase (RECOMENDADO)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# Video Storage - Opción B: AWS S3 (alternativa)
# AWS_ACCESS_KEY_ID=xxxxx
# AWS_SECRET_ACCESS_KEY=xxxxx
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=clipwise-videos

# Límites (OPCIONAL - usa defaults)
MAX_VIDEO_SIZE_MB=500
MAX_VIDEO_DURATION_SECONDS=3600
MAX_CLIPS_PER_VIDEO=10
```

### 2. Configurar Supabase Storage

Si usas Supabase (recomendado):

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Ve a **Storage** en el menú lateral
3. Crea **3 buckets públicos**:
   - `videos` (público)
   - `clips` (público)
   - `thumbnails` (público)

### 3. Verificar Base de Datos

La migración ya fue ejecutada. Verifica con:

```bash
npx prisma studio
```

Deberías ver las nuevas tablas:
- ✅ Video
- ✅ Transcription
- ✅ Clip
- ✅ ProcessingJob

### 4. Probar el Sistema

Crea un archivo de prueba `test-video-processing.ts`:

```typescript
import { transcribeOnly } from './lib/video/pipeline-example';

// Probar transcripción
async function test() {
  const result = await transcribeOnly('https://example.com/video.mp4');
  console.log(result);
}

test();
```

## 📖 Ejemplos de Uso

### Ejemplo 1: Transcribir un video

```typescript
import { transcribeVideo } from '@/lib/ai/transcribe';

const result = await transcribeVideo('https://storage.example.com/video.mp4', {
  language: 'es', // 'en', 'es', 'fr', etc.
});

console.log(result.text); // Transcripción completa
console.log(result.segments); // Array con timestamps
```

### Ejemplo 2: Detectar highlights

```typescript
import { detectHighlights } from '@/lib/ai/highlights';
import { TranscriptionSegment } from '@/lib/ai/transcribe';

const segments: TranscriptionSegment[] = [
  { start: 0, end: 5, text: 'Hola a todos...' },
  { start: 5, end: 10, text: 'Hoy vamos a hablar de...' },
  // ... más segmentos
];

const highlights = await detectHighlights(segments, {
  maxHighlights: 5,
  minDuration: 15, // segundos
  maxDuration: 60, // segundos
  targetAudience: 'TikTok Gen-Z',
});

highlights.highlights.forEach((h) => {
  console.log(`${h.title} - Score: ${h.score}/100`);
  console.log(`Hook: "${h.hookText}"`);
  console.log(`Time: ${h.startTime}s - ${h.endTime}s\n`);
});
```

### Ejemplo 3: Generar captions

```typescript
import { generateCaptions } from '@/lib/ai/captions';

const captions = await generateCaptions(clipSegments, {
  maxWordsPerSegment: 5,
  emphasizeKeywords: true,
  style: 'dynamic', // 'minimal' | 'dynamic' | 'bold'
  includeHook: true,
});

console.log(captions.captions); // Array de caption segments
console.log(captions.style); // Recomendaciones de estilo
console.log(captions.hook); // Hook para overlay
```

### Ejemplo 4: Procesar video con FFmpeg

```typescript
import { createClip } from '@/lib/video/processor';
import { CaptionSegment } from '@/lib/ai/captions';

const captions: CaptionSegment[] = [
  { startTime: 0, endTime: 2, text: 'Check this out!', emphasis: true },
  { startTime: 2, endTime: 4, text: 'Amazing trick' },
];

await createClip(
  'input.mp4',      // Video original
  10,               // Start time (segundos)
  40,               // End time (segundos)
  captions,         // Captions a quemar
  'output.mp4',     // Archivo de salida
  {
    cropToVertical: true,  // Crop a 9:16
    burnCaptions: true,    // Quemar captions
    captionStyle: {
      fontSize: 48,
      fontColor: 'white',
      position: 'bottom',
    },
  }
);
```

### Ejemplo 5: Upload a storage

```typescript
import { getStorageClient } from '@/lib/video/storage';

const storage = getStorageClient();

// Upload video
const result = await storage.uploadVideo(
  videoFile,      // File object
  'company-id',   // Company ID
  'video-id'      // Video ID
);

console.log(result.url);   // URL pública
console.log(result.path);  // Path en storage
console.log(result.size);  // Tamaño en bytes
```

### Ejemplo 6: Usar Domain Layer

```typescript
import { CreateVideo, GetCompanyVideos } from '@/domain/video/use-case';

// Crear video
const createVideo = new CreateVideo();
const video = await createVideo.execute({
  companyId: 'company-123',
  title: 'Mi primer video',
  description: 'Descripción del video',
  source: 'UPLOAD',
});

// Obtener videos de una empresa
const getVideos = new GetCompanyVideos();
const videos = await getVideos.execute('company-123');

videos.forEach((v) => {
  console.log(`${v.title} - Status: ${v.status}`);
});
```

## 🎯 Próximo Tutorial: Implementar Upload UI

Cuando estés listo, el siguiente paso es crear la interfaz de upload:

```typescript
// app/dashboard/videos/page.tsx
'use client';

import { useState } from 'react';
import { getStorageClient } from '@/lib/video/storage';
import { CreateVideo } from '@/domain/video/use-case';

export default function VideosPage() {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);

    try {
      // 1. Crear registro
      const createVideo = new CreateVideo();
      const video = await createVideo.execute({
        companyId: 'user-company-id', // Obtener del session
        title: file.name,
        source: 'UPLOAD',
      });

      // 2. Upload a storage
      const storage = getStorageClient();
      const result = await storage.uploadVideo(file, 'company-id', video.id);

      // 3. Actualizar con URL
      // ... (ver pipeline-example.ts)

      alert('Video uploaded!');
    } catch (error) {
      console.error(error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1>Upload Video</h1>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## 🐛 Troubleshooting

### Error: "OpenAI API key not configured"
**Solución**: Agrega `OPENAI_API_KEY` a tu `.env`

### Error: "No storage provider configured"
**Solución**: Configura Supabase o AWS S3 en `.env`

### Error: FFmpeg no funciona
**Solución**: Ejecuta `pnpm approve-builds` para permitir build scripts

### Error: Tipos de Prisma no encontrados
**Solución**: Ejecuta `npx prisma generate`

## 📚 Documentación Completa

- [VIDEO_PROCESSING_SETUP.md](VIDEO_PROCESSING_SETUP.md) - Setup completo
- [CLAUDE.md](CLAUDE.md) - Arquitectura del proyecto
- [lib/video/pipeline-example.ts](lib/video/pipeline-example.ts) - Ejemplos avanzados

## ✨ Features Disponibles

- ✅ Upload de videos (directo o YouTube URL)
- ✅ Transcripción con OpenAI Whisper v3
- ✅ Detección de highlights con scoring de viralidad
- ✅ Generación de captions optimizados para shorts
- ✅ Procesamiento de video (crop 9:16, burn captions)
- ✅ Storage en Supabase/S3
- ✅ Domain-driven design
- ✅ Multi-provider AI (fácil swap OpenAI ↔ Anthropic)

---

**¡Listo para empezar!** 🚀

Empieza configurando tu `.env` y luego prueba los ejemplos de código arriba.
