# 🧪 Testing Guide - Momentreel Video Processing

## Quick Testing (Sin Auth, Sin Stripe, Sin OpenAI)

### Opción 1: Página de Testing Visual

La forma más fácil de testear:

1. **Asegúrate de tener el dev server corriendo:**
   ```bash
   pnpm run dev
   ```

2. **Abre tu navegador en:**
   ```
   http://localhost:3000/test-video
   ```

3. **Selecciona un test y dale click a "Ejecutar Test":**
   - 🎤 **Transcripción** - Testea la estructura de transcripción con datos simulados
   - 🎯 **Detección de Highlights** - Testea la detección de highlights con IA simulada
   - 🚀 **Pipeline Completo** - Crea un video completo con transcripción y clips en tu DB

**¡No necesitas autenticación, Stripe, ni OpenAI API key!** Todo usa datos simulados.

### Opción 2: Testing via API

Puedes hacer requests directamente al API:

```bash
# Test de transcripción
curl -X POST http://localhost:3000/api/test-video \
  -H "Content-Type: application/json" \
  -d '{"testType": "transcribe"}'

# Test de highlights
curl -X POST http://localhost:3000/api/test-video \
  -H "Content-Type: application/json" \
  -d '{"testType": "highlights"}'

# Test de pipeline completo
curl -X POST http://localhost:3000/api/test-video \
  -H "Content-Type: application/json" \
  -d '{"testType": "full"}'
```

### Opción 3: Ver los Datos en Prisma Studio

Después de ejecutar el test de "Pipeline Completo", puedes ver los datos creados:

```bash
npx prisma studio
```

Abre http://localhost:5555 y verás:
- ✅ Video creado en la tabla `Video`
- ✅ Transcripción en la tabla `Transcription`
- ✅ Clips generados en la tabla `Clip`

## Usuario de Prueba Creado

Ya se creó un usuario de prueba en tu base de datos:

```
Email: test@momentreel.com
User ID: test-user-id
Company ID: test-company-id
```

Este usuario está vinculado a una empresa de prueba que puedes usar para testing.

## Testing con Datos Reales (Opcional)

Si quieres testear con **transcripción real de Whisper** y **detección de highlights con GPT**:

### 1. Configurar OpenAI API Key

Agrega esto a tu `.env`:

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

### 2. Crear un endpoint de prueba real

Crea `/app/api/test-video-real/route.ts` y usa las funciones reales:

```typescript
import { transcribeVideo } from '@/lib/ai/transcribe';
import { detectHighlights } from '@/lib/ai/highlights';

// ... implementar test con APIs reales
```

## Estructura de Testing

```
📂 app/
  📂 test-video/
    📄 page.tsx              # UI de testing (sin auth)
  📂 api/
    📂 test-video/
      📄 route.ts            # API endpoint para tests simulados

📂 prisma/
  📄 seed.ts                 # Crea usuario de prueba

📄 TESTING.md                # Este archivo
```

## FAQs

**Q: ¿Por qué no veo la página de testing?**
A: Asegúrate de que el dev server esté corriendo con `pnpm run dev`

**Q: ¿Necesito configurar Supabase?**
A: No para testing simulado. Solo necesitas Supabase si quieres hacer uploads reales.

**Q: ¿Los datos del test quedan en la base de datos?**
A: Sí, el test de "Pipeline Completo" crea datos reales en tu DB. Puedes eliminarlos desde Prisma Studio.

**Q: ¿Puedo usar esto en producción?**
A: No, esta es solo una página de testing para desarrollo. En producción deberías tener auth y validaciones.

**Q: ¿Cómo elimino los datos de prueba?**
A: Usa Prisma Studio (`npx prisma studio`) o ejecuta:
```bash
# CUIDADO: Esto elimina TODOS los videos
npx prisma db push --force-reset
pnpm run seed  # Recrear usuario de prueba
```

## Próximos Pasos

Después de testear:

1. **Configurar Supabase Storage** para uploads reales
2. **Agregar OpenAI API Key** para transcripción y highlights reales
3. **Implementar el dashboard de videos** en `/app/dashboard/videos`
4. **Crear background jobs** para procesamiento asíncrono

Ver [QUICKSTART.md](QUICKSTART.md) para más información.

---

**¡Happy Testing!** 🚀
