# Despliegue: Vercel + Supabase + Upstash Redis + Workers

Esta guía explica cómo desplegar la infra manteniendo el comportamiento lo más similar posible a tu entorno local (Redis en `redis://localhost:6379`, BullMQ + ioredis). Se asume que mantendrás: frontend/API en Vercel, metadata + buckets en Supabase, y workers en un servicio de contenedores (Render / Fly / Railway). Usaremos Upstash para Redis.

**Objetivo:** permitir que Next.js (API/Server Actions) y los workers usen la misma cola (`BullMQ`) con mínima diferencia frente a tu local.

---

## Arquitectura (resumen)

- Frontend & API: Vercel (Next.js). Encola jobs cuando el usuario sube o crea job.
- DB / Auth / Storage: Supabase (Postgres + Buckets).
- Cola: Upstash Redis (autenticado, TLS).
- Workers: contenedores Docker (Render / Fly / Railway / DigitalOcean App) que mantienen conexiones persistentes a Redis y ejecutan FFmpeg, transcripciones, análisis.
- ASR / LLM: OpenAI / Anthropic (APIs gestionadas).

---

## Servicios a provisionar

- Vercel project (tu repo) — setear env vars.
- Supabase project (Postgres + Buckets).
- Upstash Redis (crear database Redis, copiar `REDIS_URL` y REST si necesitás).
- Worker service (Render / Fly / Railway) para procesos largos (FFmpeg). No usar funciones serverless para FFmpeg.

---

## Upstash: pasos rápidos

1. Crear cuenta en https://upstash.com y crear una nueva instancia Redis.
2. En la consola Upstash copiar:
   - `Redis TCP URL` (ej: `rediss://:<password>@us1-xxxxx.upstash.io:6379`) — usar TLS.
   - `REST URL` y `REST TOKEN` (solo si vas a usar el cliente REST desde entornos serverless con límites de conexiones).
3. Pegar la URL TCP en `REDIS_URL` en Vercel / Render / local .env según corresponda.

**Nota:** para BullMQ y workers persistentes preferimos el endpoint TCP (rediss://) porque BullMQ usa pub/sub y streams que no funcionan vía REST.

---

## Variables de entorno recomendadas

Agrega estas variables en Vercel, Render y local `.env` según corresponda:

```
# Supabase
DATABASE_URL=postgres://...           # ya lo tenés en Supabase
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Redis (Upstash)
# Usar el Redis TCP URL (rediss://) en workers y, de preferencia, en Vercel también.
REDIS_URL=rediss://:mypassword@us1-xxxxx.upstash.io:6379
# Opcional (REST) si querés llamadas desde serverless por REST
UPSTASH_REST_URL=https://us1-rest.upstash.io
UPSTASH_REST_TOKEN=...

# OpenAI / LLM
OPENAI_API_KEY=...

# Otros
NEXT_PUBLIC_ADMIN_USER_ID=...
STRIPE_SECRET_KEY=...

```

---

## Conexión en el código (BullMQ + ioredis)

Tu `lib/queue/queue.ts` ya usa `ioredis` y `bullmq`. Con Upstash basta con apuntar `REDIS_URL` a la URL `rediss://...`.

Ejemplo recomendado (mantener `maxRetriesPerRequest: null`):

```ts
import { Queue } from "bullmq"
import IORedis from "ioredis"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

export function createRedisConnection() {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  })
}

// mantené el resto tal como está (QUEUE_NAME, add jobs, etc.)
```

Notas importantes:

- Si la URL empieza por `rediss://` ioredis habilita TLS automáticamente. No hace falta pasar `tls: {}` explícito.
- `maxRetriesPerRequest: null` es necesario para BullMQ.
- Para los workers (que mantienen la conexión), el endpoint TCP de Upstash funciona bien. Para Vercel serverless, crear conexiones puntuales para encolar es aceptable, pero ten en cuenta límites de conexión en el plan Upstash (si los hay).

---

## Recomendación para Vercel (serverless) vs workers persistentes

- Workers (Render/Fly): usar `REDIS_URL` (TCP). Mantienen conexión persistente requerida por BullMQ.
- Vercel (API routes): dos opciones:
  1. Usar el mismo `REDIS_URL` TCP con ioredis/BullMQ para encolar desde serverless. Funciona pero cada invocación abre/cierran conexiones; Upstash tolera esto mejor que Redis autogestionado, pero revisá límites de conexiones y latencia.
  2. (Alternativa) Usar `UPSTASH_REST_URL` + `UPSTASH_REST_TOKEN` con `@upstash/redis` para operaciones pequeñas desde serverless. Si elegís REST, considera tener un endpoint en el worker/ingestor que reciba solicitudes HTTP y haga `Queue.add()` (evita lógica BullMQ en serverless). Esto reproduce local con menor fricción.

Si querés lo más similar a local: preferí usar la URL TCP en todas las partes y ejecutar `pnpm dev`/`next dev` y los workers en contenedores locales apuntando a la misma `REDIS_URL`.

---

## Worker: Dockerfile y despliegue (node + ffmpeg)

En el repo añadimos un `Dockerfile` para los workers en `docker/worker/Dockerfile` que instala `ffmpeg`, dependencias y ejecuta el script `worker` definido en `package.json`.

Contenido recomendado (ya agregado en el repo):

```dockerfile
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
```

Este `Dockerfile` replica el comportamiento de desarrollo (usa `tsx` vía el script `worker`) para que el contenedor corra exactamente el mismo entrypoint que usás localmente (`pnpm run worker`).

---

## Despliegue paso a paso (snippets y comandos)

Estos "snippets" son pequeños fragmentos de configuración o comandos que podés copiar/pegar en la CLI o en la UI del servicio.

1. Provisionar servicios

- Crear proyecto en Vercel y conectar el repositorio.
- Crear proyecto en Supabase y configurar `DATABASE_URL`, buckets y keys.
- Crear instancia Redis en Upstash y copiar la `REDIS_URL` (TCP `rediss://...`).

2. Configurar variables en Vercel (UI o CLI)

Opción UI: en el dashboard de Vercel -> Settings -> Environment Variables -> Add.

Ejemplos a agregar (production):

```
REDIS_URL=rediss://:mypassword@us1-xxxxx.upstash.io:6379
DATABASE_URL=postgres://...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ADMIN_USER_ID=...
STRIPE_SECRET_KEY=...
```

Opción CLI (Vercel CLI):

```bash
# instalar vercel CLI si no la tenés
npm i -g vercel

# desde la raíz del repo, agregar una variable (ejemplo):
vercel env add REDIS_URL production
# te va a pedir pegar la URL; repetí para cada variable
```

3. Desplegar frontend en Vercel

Desde la UI o con `vercel` (o via GitHub PRs) Vercel buildará el `next build` definido en `package.json`.

4. Construir y desplegar el worker (opciones)

- Opción A — Deploy desde repo (Render / Fly):
  - Conectá tu repo desde Render.
  - En el dashboard creá un nuevo service: tipo `Worker` o `Background Worker`.
  - Usá `docker/worker/Dockerfile` como DockerfilePath (o dejá que Render construya la imagen desde el repo).
  - Configurá las mismas env vars en Render (REDIS_URL, DATABASE_URL, etc.).

  Ejemplo de `render.yaml` (ejemplo para mostrar la configuración que podés pegar en Render o usar como referencia):

  ```yaml
  services:
    - type: worker
      name: momentreel-worker
      env: docker
      repo: https://github.com/<owner>/<repo>
      branch: main
      plan: starter
      dockerfilePath: docker/worker/Dockerfile
      buildCommand: pnpm install && pnpm prisma generate
      startCommand: pnpm run worker
  ```

- Opción B — Build local y push de imagen (GHCR / Docker Hub) + deploy por imagen:

  ```bash
  # build
  docker build -t ghcr.io/<owner>/momentreel-worker:latest -f docker/worker/Dockerfile .

  # push (ejemplo GHCR)
  docker push ghcr.io/<owner>/momentreel-worker:latest
  ```

  Luego, en Render / Fly podés desplegar usando la imagen `ghcr.io/<owner>/momentreel-worker:latest` y configurar las env vars.

5. Probar e iterar

- Hacé un deploy de prueba y lanzá un job desde la UI de la app o con curl a tu API que encola `ingest`.
- Verificá logs del worker en Render/Fly para confirmar que la conexión a Redis (Upstash) funciona y que BullMQ recibe jobs.
- Si hay problemas de conexiones desde Vercel (serverless) a Upstash por límites de TCP, usá la alternativa `UPSTASH_REST_URL` desde Vercel o implementá un pequeño HTTP enqueue proxy en el worker.

6. Comandos útiles locales (paridad con producción)

```bash
# levantar redis local (dev)
docker run -p 6379:6379 --name redis -d redis:7

# correr next en dev
pnpm dev

# correr worker local (usa tsx como en package.json)
pnpm run worker

# probar encolar manualmente (node script o curl a tu API)
node -e "require('./lib/queue/queue').enqueueIngest({ videoId: 'v1', sourceUrl: 'https://youtu.be/..', source: 'YOUTUBE' })"
```

7. Troubleshooting rápido

- BullMQ no recibe jobs: revisar `REDIS_URL`, comprobar que el worker y el API usan la misma cola `QUEUE_NAME`.
- TLS / certificados: si usás `rediss://` ioredis habilita TLS automáticamente; si tenés errores, probá la conexión local con `redis-cli` o `ioredis` desde un script corto.
- Límites Upstash: en planes gratuitos el número de conexiones persistentes puede ser limitado — preferir REST para serverless o aumentar plan.

---

Si querés, creo también:

- `docker/worker/.dockerignore` (ligero)
- Un `render.yaml` real en la raíz
- Un `scripts/deploy-render.sh` con comandos para push automático a GHCR y un recordatorio de variables

Decime qué prefieres y lo creo automáticamente.

---

## Cómo probar localmente (paridad con Upstash)

1. Opción A (local-Redis, exactamente como tu dev actual):
   - Corre Redis local: `docker run -p 6379:6379 --name redis -d redis:7`.
   - En `.env.local` pon `REDIS_URL=redis://localhost:6379`.
   - Arrancar Next (`pnpm dev`) y workers (`pnpm tsx scripts/worker.ts`) y hacer pruebas.

2. Opción B (usar Upstash desde local):
   - Poner en `.env.local` la `REDIS_URL` de Upstash (rediss://...)
   - Ejecutar Next y workers apuntando a la misma `REDIS_URL`.

Recomendación: durante desarrollo usar Redis local para velocidad; hacer una prueba puntual contra Upstash antes de deploy para validar credenciales y TLS.

---

## Consideraciones operativas

- Límites de conexión y throughput: revisar el plan de Upstash (free vs pagado) y ajustar dónde encolar (usar REST para serverless si hay límites grandes en TCP connections).
- Monitorización: monitor de BullMQ (Arena, Bull Board) y logs del worker. Considerá Sentry + métricas.
- Retry y visibilidad: BullMQ maneja `attempts` y `backoff`. Asegurate de instrumentar eventos `failed`, `completed`.
- Seguridad: no exponer `REDIS_URL` públicamente; usar variables de entorno en Vercel / Render.

---

## Resumen de cambios mínimos en tu repo

- No es obligatorio cambiar `lib/queue/queue.ts` si `REDIS_URL` apunta a Upstash.
- Asegurá que tus workers corran en contenedores persistentes y que `createRedisConnection()` se use para todas las conexiones de BullMQ.
- Si experimentás problemas de conexiones desde Vercel, migrá a la alternativa de REST + un pequeño HTTP enqueue proxy en Render.

---

¿Querés que genere automáticamente:

- un `docker/worker/Dockerfile` real en el repo con ajustes exactos para tu worker actual, y
- un snippet `vercel env add` / Render deploy example y los cambios mínimos para `lib/queue/queue.ts`?

Puedo crear esos artefactos y un `docs/` más detallado con comandos copiados listos para pegar.
