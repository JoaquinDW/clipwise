# PRD — Momentum V2: Candidate First Analysis Pipeline

## Objetivo

Reducir entre 60% y 90% el costo de IA por video y disminuir significativamente el tiempo total de procesamiento, manteniendo o mejorando la calidad de los clips generados.

La nueva arquitectura evitará enviar transcripciones completas a GPT y utilizará un sistema de scoring previo para identificar únicamente los segmentos más prometedores.

---

# Problema actual

Pipeline actual:

Video
→ Audio
→ Transcripción completa
→ GPT analiza toda la transcripción
→ Selección de clips
→ Render

Problemas:

- Costos altos en videos largos.
- GPT recibe grandes cantidades de texto irrelevante.
- Latencia elevada.
- Escalabilidad limitada.
- Riesgo de context windows gigantes.

Ejemplo:

Video de 2 horas

Transcript:
~30.000 tokens

Prompt:
~4.000 tokens

Total:
~34.000 tokens enviados a GPT.

La mayoría del contenido no aporta valor para detectar clips virales.

---

# Objetivo de negocio

Reducir:

- costo por video
- tiempo promedio de procesamiento
- consumo de tokens

Aumentar:

- cantidad de videos procesados por día
- margen por usuario
- capacidad de escalar

---

# Nueva arquitectura

Pipeline:

Ingest
→ Audio Chunks
→ Whisper
→ Scoring Local
→ Candidate Generation
→ GPT Ranking
→ Clip Selection
→ Render

GPT deja de ser el detector principal.

GPT pasa a ser un rankeador.

---

# Fase 1: Segmentación Inteligente

Dividir el transcript en ventanas.

Ejemplo:

Ventana de 30 segundos.

Output:

Segment A
00:00–00:30

Segment B
00:30–01:00

Segment C
01:00–01:30

...

Cada segmento recibe un score.

---

# Fase 2: Heuristic Scoring Engine

Crear un motor de puntuación local.

Factores:

## Emotional Language

Palabras:

- increíble
- nunca
- imposible
- locura
- brutal
- secreto
- error
- nadie sabe

Peso alto.

---

## Question + Answer Pattern

Ejemplo:

"¿Sabés cuál fue el error más grande?"

Seguido por:

"El error fue..."

Patrón de alto interés.

---

## Story Arc Detection

Detectar:

- problema
- tensión
- resolución

Puntuar positivamente.

---

## Speech Density

Segmentos con mucho diálogo útil.

Evitar:

- silencios
- pausas largas
- música

---

## Strong Statements

Ejemplos:

- esto cambió mi vida
- perdí todo
- gané millones
- nadie esperaba esto

Score adicional.

---

# Fase 3: Candidate Generation

Generar candidatos.

Ejemplo:

240 segmentos analizados.

Resultado:

Top 20 segmentos.

Solo estos continúan.

---

# Fase 4: Context Expansion

Antes de enviar a GPT:

Expandir cada candidato.

Ejemplo:

Segmento detectado:

12:15–12:40

Enviar:

12:00–13:00

para que GPT tenga contexto.

---

# Fase 5: GPT Ranking

GPT recibe únicamente candidatos.

Input:

20 segmentos.

No recibe 2 horas completas.

Tareas:

- puntuar viralidad
- puntuar claridad
- puntuar emoción
- puntuar potencial de retención
- proponer inicio y fin óptimos

Output:

Top 5 clips.

---

# Fase 6: Clip Optimization

GPT ajusta:

- hook inicial
- duración ideal
- lead-in
- lead-out

Ejemplo:

Detectado:

10:42–11:05

Final:

10:35–11:12

---

# Modelo de Datos

Candidate

{
id,
job_id,
start_time,
end_time,
transcript,
heuristic_score,
gpt_score,
final_score
}

---

# Nuevos Estados

queued

ingesting

transcribing

scoring

generating_candidates

ranking

rendering

done

failed

---

# Métricas

## Cost Reduction

Objetivo:

-70% tokens GPT

---

## Latency Reduction

Objetivo:

30-50 min

↓

10-20 min

---

## Candidate Compression Ratio

Medir:

segmentos totales

vs

segmentos enviados a GPT

Objetivo:

240 segmentos

↓

20 candidatos

(92% reducción)

---

# Roadmap

V2.1

Heurísticas básicas

- keywords
- speech density
- preguntas/respuestas

V2.2

Embeddings

Detección de cambios temáticos.

V2.3

Modelo de scoring propio entrenado con datos reales.

V2.4

Feedback loop.

Aprender de:

- clips descargados
- clips compartidos
- clips ignorados

para mejorar automáticamente el ranking.

---

# Resultado Esperado

Video de 2 horas.

Antes:

GPT analiza 30.000 tokens.

Costo aproximado:
$1/video

Tiempo:
30-50 min

Después:

GPT analiza 3.000-8.000 tokens.

Costo aproximado:
$0.15-$0.30/video

Tiempo:
10-20 min

Misma calidad o superior.
