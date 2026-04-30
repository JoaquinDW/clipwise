# PRD — Stream Import (Twitch/Kick/YouTube Live VOD)

## Feature Name

Stream Import & Auto Clipping

---

# Objetivo

Permitir que usuarios importen streams largos desde plataformas externas (principalmente Twitch y Kick) sin necesidad de subir archivos manualmente, para generar automáticamente clips cortos listos para TikTok, Reels y Shorts.

La feature debe:

- reducir drásticamente el tiempo de ingestión,
- evitar uploads manuales enormes,
- permitir procesamiento incremental,
- mejorar UX y activación,
- habilitar creators de streams como ICP principal.

---

# Problema

Actualmente el usuario puede:

- pegar URL de YouTube,
- o subir un archivo manualmente.

Problemas del upload manual:

- tarda muchísimo,
- consume mucho bandwidth,
- genera abandono,
- streams pesan decenas de GB,
- mala UX para creators frecuentes.

Problemas actuales del mercado:

- clipping manual consume horas,
- encontrar highlights es tedioso,
- exportar vertical consume tiempo,
- creators necesitan volumen constante de contenido corto.

---

# Objetivo de negocio

## Corto plazo

- mejorar onboarding,
- reducir fricción,
- aumentar activación,
- validar niche de streamers.

## Mediano plazo

- posicionarse como herramienta especializada para stream clipping,
- aumentar retención,
- aumentar perceived value,
- justificar pricing higher-tier.

---

# Plataformas soportadas

## MVP

### Twitch VOD

Prioridad máxima.

### YouTube VOD / streams

Ya parcialmente soportado.

### Kick VOD

Experimental beta.

---

# No incluido en MVP

- livestream realtime clipping,
- TikTok Live,
- Facebook Live,
- streams privados protegidos,
- multi-stream imports,
- editor avanzado timeline,
- auto posting.

---

# User Stories

## Importación

### Como streamer

Quiero pegar una URL de Twitch
Para generar clips automáticamente sin subir archivos manualmente.

---

### Como creator

Quiero empezar el procesamiento rápidamente
Para no esperar horas de upload.

---

### Como usuario

Quiero ver progreso en tiempo real
Para entender qué está haciendo el sistema.

---

## Clipping

### Como usuario

Quiero recibir clips automáticamente detectados
Para ahorrar tiempo editando.

---

### Como usuario

Quiero clips verticales con subtítulos
Para publicarlos directamente.

---

# UX Flow

## Happy Path

```plaintext
1. User pega URL
2. Sistema valida plataforma
3. Se crea job
4. Comienza ingestión incremental
5. Usuario ve estado:
   - ingesting
   - transcribing
   - analyzing
6. Primeros clips aparecen progresivamente
7. Usuario preview/download/export
```

---

# UI Components

## Input de URL

Placeholder:

```plaintext
Paste Twitch, Kick or YouTube URL
```

---

## Job Status Card

Estados:

- queued
- ingesting
- transcribing
- analyzing
- rendering
- completed
- failed

Mostrar:

- progreso,
- duración detectada,
- clips encontrados,
- ETA aproximado.

---

## Clips Grid

Cada clip muestra:

- preview,
- duración,
- score,
- título generado,
- transcript preview,
- download button.

---

# Arquitectura Técnica

## Filosofía

NO descargar video completo primero.

Pipeline incremental:

```plaintext
stream manifest
→ audio chunks
→ transcript
→ AI scoring
→ clip candidates
→ render final
```

---

# Pipeline Técnico

## 1. URL Ingestion Worker

Responsabilidades:

- detectar plataforma,
- validar URL,
- obtener metadata,
- resolver acceso HLS/VOD,
- crear job.

Input:

```json
{
  "source_url": "...",
  "platform": "twitch"
}
```

Output:

```json
{
  "job_id": "...",
  "status": "ingesting"
}
```

---

## 2. Stream Resolver

Responsabilidades:

- resolver manifests HLS (.m3u8),
- obtener segmentos,
- preparar lectura incremental.

Herramientas sugeridas:

- yt-dlp
- ffmpeg
- streamlink

---

## 3. Chunk Processor

Responsabilidades:

- consumir segmentos .ts,
- extraer audio,
- generar chunks temporales.

Chunk recomendado:

```plaintext
30–60 segundos
```

Metadata:

```json
{
  "chunk_id": "...",
  "start_time": 120,
  "end_time": 180
}
```

---

## 4. Transcription Worker

Responsabilidades:

- transcribir chunks,
- mantener timestamps absolutos,
- persistir transcript parcial.

Opciones:

### MVP

- Whisper API

### Escalable

- Deepgram
- Whisper local GPU

---

## 5. Highlight Detection Worker

Responsabilidades:

- analizar transcript,
- detectar momentos clippeables,
- scorear segmentos.

Métodos:

### MVP

- heurísticas
- LLM ranking

Señales:

- emoción,
- frases fuertes,
- cambios de tono,
- humor,
- reacción intensa,
- storytelling.

Output:

```json
{
  "start": 1320,
  "end": 1360,
  "score": 0.91
}
```

---

## 6. Clip Render Worker

Responsabilidades:

- cortar timestamps ganadores,
- render vertical,
- generar captions,
- exportar MP4 final.

Herramienta:

```plaintext
ffmpeg
```

---

# Infraestructura

## Queue System

Recomendado:

- Redis + BullMQ

Workers separados:

- ingest
- transcript
- analysis
- render

---

## Storage

## Temporal

- audio chunks
- manifests
- previews

## Persistente

- clips finales
- transcripts
- metadata

Recomendado:

- S3 / R2

---

# Base de datos

## Tabla Jobs

```json
{
  "id": "...",
  "user_id": "...",
  "platform": "twitch",
  "source_url": "...",
  "status": "transcribing",
  "progress": 45
}
```

---

## Tabla Chunks

```json
{
  "id": "...",
  "job_id": "...",
  "start_time": 0,
  "end_time": 60,
  "status": "done"
}
```

---

## Tabla Clips

```json
{
  "id": "...",
  "job_id": "...",
  "start_time": 1320,
  "end_time": 1360,
  "score": 0.91,
  "video_url": "..."
}
```

---

# Estados del Job

```plaintext
queued
ingesting
chunking
transcribing
analyzing
rendering
completed
failed
```

---

# Requerimientos Funcionales

## RF-1

El usuario debe poder importar una URL de Twitch.

---

## RF-2

El sistema debe detectar automáticamente la plataforma.

---

## RF-3

El sistema debe comenzar procesamiento sin esperar download completo.

---

## RF-4

El usuario debe ver progreso en tiempo real.

---

## RF-5

El sistema debe generar entre 3 y 10 clips automáticamente.

---

## RF-6

Los clips deben renderizarse en formato vertical 9:16.

---

## RF-7

Los clips deben incluir subtítulos quemados.

---

# Requerimientos No Funcionales

## Performance

- primer clip candidato < 5 minutos idealmente,
- jobs concurrentes soportados,
- retry automático.

---

## Escalabilidad

- arquitectura distribuida,
- workers independientes,
- procesamiento incremental.

---

## Robustez

- jobs idempotentes,
- retries por chunk,
- tolerancia a fallos parciales.

---

# Limitaciones MVP

## Twitch

- solo VODs públicos,
- no clips live.

---

## Kick

- soporte experimental,
- posibles cambios de plataforma.

---

## Uploads manuales

Limitar:

- tamaño,
- duración,
- resolución.

---

# Riesgos Técnicos

## Twitch cambia endpoints

Mitigación:

- usar yt-dlp,
- abstraer providers.

---

## Streams largos

Mitigación:

- chunking,
- audio-first processing,
- cleanup agresivo.

---

## Costos de transcription

Mitigación:

- heurísticas primero,
- limitar duración free plan,
- usar LLM solo en segmentos prometedores.

---

# Métricas de éxito

## Product

- tiempo hasta primer clip,
- jobs completados,
- clips descargados,
- retention D7,
- conversion free → paid.

---

## Technical

- tiempo promedio de ingestión,
- tiempo promedio a primer clip,
- costo promedio por job,
- tasa de fallos por plataforma.

---

# Roadmap Futuro

## V2

- live clipping realtime,
- detección de cámara/hablante,
- auto posting,
- editor inline,
- webhooks.

---

## V3

- clips durante stream en vivo,
- AI titles/hooks,
- viral score prediction,
- cross-platform publishing.

---

# Recomendación de implementación

## Orden ideal

### Fase 1

- Twitch VOD
- yt-dlp
- chunked transcript
- heurísticas simples
- render vertical básico

### Fase 2

- Kick
- LLM ranking
- captions avanzados
- mejores scores

### Fase 3

- realtime streams
- live highlights
- auto publish

---

# Resultado esperado

El usuario debería sentir:

```plaintext
Pegué un stream de 4 horas
↓
En pocos minutos aparecieron clips listos para publicar
↓
Sin subir archivos gigantes
↓
Sin editar manualmente
```

Ese es el “magic moment” principal de la feature.
