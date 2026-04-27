# 🎬 Auto Clip Generator — Relevamiento Técnico Completo

## Objetivo

Construir una feature que tome un video largo (stream, podcast, charla, entrevista, gameplay, etc.) y genere automáticamente clips cortos con potencial viral.

La idea central es esta:

- no descargar ni procesar todo el video de forma monolítica,
- sino armar un pipeline por etapas,
- donde cada etapa trabaje sobre fragmentos, metadatos o resultados parciales.

---

# Problema que resuelve

Un video de 2 horas puede ser muy costoso de manejar si el sistema hace esto:

```plaintext
descargar video completo -> transcribir todo -> analizar todo -> recortar todo
```

Eso escala mal porque:

tarda mucho en arrancar,
consume mucho ancho de banda,
requiere bastante almacenamiento temporal,
es difícil de paralelizar,
y bloquea el procesamiento hasta tener todo listo.

La solución es diseñar un flujo incremental y distribuido.

1. Ingesta del video
2. Obtención del audio
3. Segmentación en chunks
4. Transcripción incremental
5. Análisis de transcript
6. Detección de momentos candidatos
7. Corte del video en esos timestamps
8. Post-procesado del clip
9. Exportación / storage / entrega al usuario
   Arquitectura conceptual
   Componentes principales
10. API / Backend principal

Recibe el input del usuario y crea un job.

Responsabilidades:

validar URL o archivo,
crear el registro del procesamiento,
poner el job en cola,
exponer estado y resultados. 2. Worker de ingesta

Se encarga de obtener el contenido fuente.

Responsabilidades:

leer un video subido,
o resolver una URL externa,
preparar el acceso al media stream,
obtener audio y/o video según la estrategia. 3. Worker de transcripción

Convierte audio en texto con timestamps.

Responsabilidades:

tomar chunks de audio,
enviar a un motor ASR,
guardar transcript parcial,
normalizar timestamps. 4. Worker de análisis

Detecta segmentos interesantes.

Responsabilidades:

analizar transcript,
puntuar segmentos,
identificar hooks, emoción, cambio de tema, punchlines, etc.,
devolver candidatos de clip. 5. Worker de render / corte

Extrae los clips finales del video.

Responsabilidades:

cortar rangos de tiempo,
corregir cortes con keyframes si hace falta,
generar los archivos finales. 6. Worker de post-procesado

Mejora el clip para distribución.

Responsabilidades:

subtítulos quemados o sidecar,
formato vertical,
reencuadre,
branding,
exportación final. 7. Storage

Guarda:

video fuente temporal,
audios,
transcripts,
metadata,
clips renderizados,
previews. 8. Cola / orquestador

Coordina tareas entre etapas.

Ejemplos:

Redis Queue,
SQS,
RabbitMQ,
Celery,
BullMQ.
Idea clave: no procesar video completo de una sola vez

La lógica eficiente no es:

descargar 2 horas completas y recién ahí empezar

Sino algo más parecido a esto:

stream / fragmentos -> audio -> transcript -> detección -> corte

Esto permite:

empezar antes,
procesar en paralelo,
reducir costos,
escalar mejor,
hacer jobs más robustos.
Diseño del flujo paso a paso

1. Ingesta

El usuario pega una URL o sube un archivo.

Casos posibles
YouTube
Twitch VOD
archivo uploadado
URL directa de MP4/HLS
podcast/video alojado en otra plataforma
Qué hace el backend
crea un job_id,
guarda datos base,
valida formato,
decide el tipo de fuente,
pone el job en cola.
Estados típicos
queued -> ingesting -> transcribing -> analyzing -> clipping -> rendering -> done 2. Obtención del audio

Para detectar buenos clips, el audio suele ser mucho más importante que el video al principio.

Estrategia recomendada

Primero extraer audio y procesarlo por chunks.

Eso reduce:

ancho de banda,
uso de disco,
costo de compute.
Dos enfoques
Enfoque simple para MVP

Descargar o extraer el audio completo.

Pros:

fácil de implementar,
ideal para validar producto.

Contras:

no escala tan bien,
usa más almacenamiento temporal.
Enfoque escalable

Procesar el audio en streaming o por fragmentos.

Pros:

menos latencia,
menos uso de disco,
más flexible.

Contras:

más complejo de implementar,
requiere manejo fino de buffering y timestamps. 3. Segmentación en chunks

En lugar de tratar el video como un bloque único, se divide en partes pequeñas.

Ejemplo:

chunks de 15 segundos,
chunks de 30 segundos,
chunks de 60 segundos.
Por qué sirve
permite paralelismo,
evita esperar el archivo completo,
mejora la resiliencia ante fallos,
facilita reintentos parciales.
Qué se guarda por chunk
chunk_id
start_time
end_time
path temporal del audio
estado de procesamiento
transcript parcial
score inicial 4. Transcripción incremental

Cada chunk de audio se manda a un motor ASR.

Opciones de ASR
Whisper local
Whisper vía API
Deepgram
AssemblyAI
otros motores de speech-to-text
Output esperado
[
{
"start": 12.5,
"end": 15.2,
"text": "esto es una locura"
},
{
"start": 15.2,
"end": 18.9,
"text": "no esperaba este resultado"
}
]
Puntos importantes
mantener timestamps absolutos del video,
normalizar todo a una misma escala,
guardar confidence score si el proveedor lo da,
unir chunks consecutivos de forma consistente. 5. Análisis del transcript

Acá está el valor de producto.

No alcanza con transcribir; hay que decidir qué momentos pueden ser clips.

Señales útiles
sorpresa,
emoción,
tensión,
controversia,
chistes,
conclusiones fuertes,
frases “quoteables”,
cambios de tema,
respuestas intensas,
storytelling con resolución. 6. Detección de momentos candidatos

Hay varias estrategias, y se pueden combinar.

Estrategia A: heurística simple

Ideal para MVP.

Ejemplos:

frases con alto impacto,
segmentos con mucha densidad de diálogo,
frases cortas con lenguaje fuerte,
preguntas + respuesta potente,
segmentos de 15 a 60 segundos.
Estrategia B: embeddings

Convertir el transcript a representaciones semánticas y detectar:

picos de interés,
cambios temáticos,
secciones más intensas.
Estrategia C: LLM

Pasarle bloques del transcript y pedir:

mejores clips,
timestamps,
motivo de selección,
ranking por potencial viral.
Ejemplo de salida
[
{
"start": 1320,
"end": 1360,
"reason": "strong emotional reaction",
"score": 0.91
},
{
"start": 1880,
"end": 1935,
"reason": "clear punchline and payoff",
"score": 0.88
}
] 7. Selección final de clips

No todos los candidatos se convierten en clip final.

Hay que filtrar por:

duración mínima y máxima,
solapamiento entre segmentos,
calidad del audio,
confianza de transcripción,
continuidad del contexto,
reglas del producto.
Reglas comunes
evitar clips demasiado cortos,
evitar clips que empiezan en mitad de una idea,
evitar cortes que dejan una frase incompleta,
sumar contexto antes del momento fuerte,
dejar un pequeño “lead-in” y “lead-out”.

Ejemplo:

momento detectado: 10:42–11:05
clip final: 10:35–11:12 8. Corte del video

Una vez definidos los timestamps, recién ahí se trabaja sobre el video.

Herramienta típica

ffmpeg

Corte con stream copy
ffmpeg -ss START -to END -i input.mp4 -c copy output.mp4
Problema

El corte exacto puede verse afectado por keyframes.

Solución
ajustar al keyframe más cercano,
o re-encodear solo el fragmento final.
Re-encode de un segmento
ffmpeg -ss START -to END -i input.mp4 -c:v libx264 -c:a aac output.mp4
Recomendación práctica
usar -c copy cuando el margen de error sea aceptable,
re-encodear solo los clips que realmente se van a entregar.
Post-procesado del clip

Una vez cortado el video, se puede enriquecer.

Opciones comunes
subtítulos quemados,
subtítulos descargables,
formato vertical 9:16,
crop dinámico al hablante,
branding,
intro/outro corta,
watermarks,
título automático.
Verticalización

Muy importante para clips sociales.

Caso común

El video fuente está en 16:9, pero el destino es TikTok / Reels / Shorts.

Soluciones
recorte manual al centro,
auto reframe sobre el hablante,
tracking facial,
crop inteligente.
Subtítulos

Suelen aumentar retención y claridad.

Formas de renderizar subtítulos
burned-in dentro del video,
.srt o .vtt como archivo aparte,
subtítulos estilizados.
Recomendación

Para una feature de clips virales, lo más útil suele ser:

subtítulos quemados,
con estilo legible,
sincronizados por frase o por palabra.
Almacenamiento

Conviene separar tipos de assets.

Qué guardar
video original temporal,
audio extraído,
chunks de audio,
transcript por chunk,
transcript unificado,
candidates,
clips renderizados,
thumbnails,
preview frames,
logs de procesamiento.
Dónde guardar
object storage tipo S3 o compatible,
base de datos para metadata,
cache temporal para chunks intermedios.
Modelo de datos sugerido
Job
{
"id": "job_123",
"source_type": "youtube",
"source_url": "https://...",
"status": "queued",
"created_at": "2026-04-26T13:00:00Z",
"updated_at": "2026-04-26T13:01:12Z"
}
Chunk
{
"id": "chunk_45",
"job_id": "job_123",
"start_time": 270,
"end_time": 300,
"status": "transcribed"
}
Transcript segment
{
"job_id": "job_123",
"chunk_id": "chunk_45",
"start": 272.3,
"end": 275.8,
"text": "esto cambia todo"
}
Clip candidate
{
"job_id": "job_123",
"start_time": 1320,
"end_time": 1360,
"score": 0.91,
"reason": "strong emotional reaction"
}
Final clip
{
"job_id": "job_123",
"clip_id": "clip_01",
"status": "ready",
"video_url": "s3://...",
"subtitle_url": "s3://..."
}
Estados del job

Una máquina de estados ayuda muchísimo.

queued
ingesting
chunking
transcribing
analyzing
selecting_clips
rendering
post_processing
done
failed
Qué conviene guardar
estado actual,
progreso porcentual,
etapa actual,
error si falló,
reintentos,
duración total procesada.
Flujo técnico recomendado para un MVP

Si querés salir rápido, esta sería la versión más práctica:

MVP recomendado
aceptar URL o upload,
descargar audio completo,
transcribir por chunks,
analizar transcript con heurísticas o LLM,
elegir 3 a 10 candidatos,
cortar esos rangos,
generar subtítulos básicos,
devolver clips.
Ventajas
fácil de construir,
suficiente para validar mercado,
no requiere arquitectura demasiado compleja al inicio.
Flujo técnico recomendado para escalabilidad

Cuando quieras subir de nivel:

Versión escalable
ingestión en background,
audio por streaming o fragmentos,
transcripción incremental,
análisis continuo mientras sigue entrando contenido,
scoring progresivo,
selección de highlights en paralelo,
corte final solo de segmentos ganadores,
render distribuido,
storage y entrega asincrónica.
Ventajas
menor latencia,
mejor uso de recursos,
soporta muchos jobs simultáneos,
más barato por video procesado.
Trade-offs importantes
Descarga completa vs streaming
Descarga completa
más simple,
más fácil de debuggear,
menos complejidad inicial.
Streaming / chunks
más complejo,
mucho mejor para escala,
menor latencia y storage.
Análisis con LLM vs heurísticas
LLM
mejor calidad de selección,
más costo,
más dependencia externa.
Heurísticas
más baratas,
más rápidas,
más fáciles de controlar,
menos “inteligentes”.
Recomendación

Combinar ambas:

heurísticas para filtrar,
LLM para rankear lo mejor.
Corte exacto vs corte rápido
Corte rápido
usa stream copy,
menos CPU,
puede ser impreciso.
Corte exacto
re-encode,
más costo,
mejor resultado final.
Observaciones prácticas de implementación

1. No intentes detectar clips mirando solo video

En la mayoría de los casos, el audio/transcript da la mayor señal útil.

2. Guardá todo con timestamps absolutos

Si cada chunk tiene tiempo local, después se vuelve un caos unirlos.

3. Diseñá idempotencia

Un job debe poder reintentarse sin romper el estado.

4. Separá “detectar” de “renderizar”

Primero encontrá buenos momentos; después renderizalos.

5. Pensá en costo

El sistema ideal no procesa 100% del video a nivel pesado si solo vas a exportar 2 o 3 clips.

Pipeline resumido en pseudoflujo

1.  user submits URL/upload
2.  backend creates job
3.  ingester prepares source
4.  audio is extracted in chunks
5.  each chunk is transcribed
6.  transcript is merged
7.  analysis engine scores moments
8.  top candidates are selected
9.  ffmpeg cuts the selected ranges
10. subtitles and formatting are applied
11. final clips are uploaded to storage
12. user receives results
    Pseudocódigo simple
    def process_video(source):
    job = create_job(source)
    chunks = ingest_and_chunk(source)

        transcript = []
        for chunk in chunks:
            text_segments = transcribe(chunk)
            transcript.extend(text_segments)

        candidates = detect_highlights(transcript)
        final_clips = []

        for candidate in candidates:
            clip = cut_video(source, candidate.start, candidate.end)
            clip = post_process_clip(clip)
            final_clips.append(upload_clip(clip))

        mark_job_done(job, final_clips)
        return final_clips

La diferencia no está solo en “cortar clips”.

La feature gana valor cuando:

detecta buenos momentos con criterio,
reduce trabajo manual,
entrega clips listos para publicar,
escala sin que el costo explote,
y es suficientemente rápida para que el usuario sienta magia.
Resumen ejecutivo

La forma correcta de construir esto no es:

descargar todo -> procesar todo -> cortar todo

Sino:

ingestar -> chunkear -> transcribir -> analizar -> seleccionar -> cortar -> postprocesar

Ese es el flujo que te da:

escalabilidad,
velocidad,
menor costo,
mejor UX,
y una base sólida para crecer.
