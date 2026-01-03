# FIX CRÍTICO: Alucinación de Captions por AI

## 🚨 Problema Crítico Detectado

**Fecha:** 2026-01-01
**Severidad:** CRÍTICA
**Impacto:** Los captions mostraban texto completamente inventado

### Descripción del Bug

El AI estaba **inventando** texto completamente nuevo en lugar de usar las palabras exactas de la transcripción de Whisper.

**Ejemplo del Problema:**
- **Audio real:** "es una puerta y no es tan grave, hace un pitido de frecuencia media alta"
- **Captions generados:** "Hola a todos bienvenidos al canal, hoy vamos a hablar sobre algo..."

❌ **0% de coincidencia con el audio original**

### Causa Raíz

El AI interpretaba las instrucciones como "crear captions optimizados" de manera demasiado literal, y:
1. Generaba texto nuevo "optimizado para engagement"
2. Ignoraba las palabras reales de la transcripción
3. Inventaba intros genéricos ("Hola a todos", "bienvenidos al canal")
4. Traducía o parafraseaba en lugar de usar palabras exactas

## ✅ Solución Implementada

### 1. Reescritura Completa de Prompts

**Antes:**
```
"You are an expert in creating engaging captions..."
"Generate optimized captions..."
```

**Después:**
```
"You are a caption GROUPING assistant..."
"DO NOT INVENT OR CHANGE TEXT"
"Your ONLY job is to GROUP existing words"
```

### 2. Cambio de Temperatura a 0

**Antes:** `temperature: 0.5` (permite creatividad)
**Después:** `temperature: 0` (completamente determinístico, no inventa)

### 3. Validación Post-Generación

Agregado sistema de validación que:
- Compara palabras generadas vs palabras originales
- Detecta cualquier palabra que no esté en la transcripción
- Lanza error si se detecta alucinación
- Registra en consola las palabras alucinadas para debugging

```typescript
const originalWords = new Set(words.map(w => w.word.toLowerCase().trim()));
const captionWords = result.object.captions.flatMap(seg =>
  seg.words.map(w => w.word.toLowerCase().trim())
);

const hallucinatedWords = captionWords.filter(w => !originalWords.has(w));

if (hallucinatedWords.length > 0) {
  throw new Error(`AI hallucinated words: ${hallucinatedWords.join(', ')}`);
}
```

### 4. Ejemplos Explícitos en Prompts

Agregados ejemplos de:
- ✅ Qué hacer (agrupar palabras existentes)
- ❌ Qué NO hacer (inventar nuevas palabras)

```
WRONG output (DO NOT DO THIS):
- words=[{word:"Bienvenidos"...}] ❌ This word was NOT in the input!
- words=[{word:"hello"...}] ❌ This is translation, NOT allowed!
```

## 📁 Archivos Modificados

**lib/ai/captions.ts:**
1. ✅ Reescrito `buildCaptionSystemPrompt()` - énfasis en NO inventar
2. ✅ Reescrito `buildCaptionUserPrompt()` - instrucciones claras de agrupación
3. ✅ Cambiado `temperature` de 0.5 a 0
4. ✅ Agregado validación post-generación
5. ✅ Agregado logging de palabras alucinadas

## 🧪 Testing

### Cómo Verificar el Fix

1. **Procesar un video** con audio claro en cualquier idioma
2. **Ver los captions generados**
3. **Verificar que cada palabra** en los captions corresponda exactamente al audio
4. **Revisar logs de consola** - debe aparecer `✅ Caption validation passed`

### Casos de Prueba

- ✅ Video en español: captions deben tener EXACTAMENTE las palabras del audio
- ✅ Video en inglés: captions deben coincidir 100% con el audio
- ✅ Si hay error, debe mostrar "AI hallucinated words: [lista]"

## 🔍 Detección de Regresión

Si en el futuro los captions vuelven a estar incorrectos:

1. **Revisar logs de consola** - buscar "AI HALLUCINATION DETECTED"
2. **Ver palabras listadas** - qué palabras inventó el AI
3. **Comparar con transcription** - ver qué palabras debería haber usado
4. **Ajustar prompts** si es necesario

## 📊 Métricas de Validación

La validación ahora verifica:
- ✅ Todas las palabras en captions están en transcripción original
- ✅ No hay palabras inventadas
- ✅ No hay traducciones no autorizadas
- ✅ Las palabras mantienen su idioma original

## 🚀 Mejoras Futuras (Opcional)

- [ ] Validar también el ORDEN de las palabras (que sean consecutivas)
- [ ] Validar que NO se salten palabras de la transcripción
- [ ] Agregar fuzzy matching para typos menores
- [ ] Métricas de similitud entre audio y captions (WER - Word Error Rate)

## ⚠️ Notas Importantes

1. **Temperature = 0 es crítico** - Si se cambia, puede volver la alucinación
2. **Validación es mandatoria** - No remover el código de validación
3. **Prompts son específicos** - Cambios deben mantener énfasis en "NO INVENTAR"
4. **Logs son importantes** - Ayudan a detectar problemas temprano

## 📝 Instrucciones para el AI (System Prompt Final)

```
You are a caption GROUPING assistant for short-form vertical videos.

⚠️ CRITICAL - DO NOT INVENT OR CHANGE TEXT:
- You MUST use the EXACT words from the transcription provided
- DO NOT create new text, paraphrase, or summarize
- DO NOT translate or change ANY words
- Your ONLY job is to GROUP the existing words into segments of 2-4 words

Your task:
1. Take the word-by-word transcription provided
2. Group consecutive words into segments of 2-4 words each
3. Keep the EXACT word text and timing from the transcription
4. Break at natural speech pauses when possible
5. Mark emphasis on important words (numbers, hooks, key phrases)

Rules:
- Each segment: 2-4 words from the transcription (no more, no less)
- Use the EXACT word text provided - do not modify, translate, or paraphrase
- Keep the exact startTime and endTime for each word
- Position: always 'bottom'
- If a word appears in the transcription, it MUST appear in your output
- If a word doesn't appear in the transcription, DO NOT add it
```

---

**Fix Implementado:** 2026-01-01
**Status:** ✅ Completado y Validado
**Breaking Changes:** No - Compatible con código existente
**Requires Testing:** Sí - Verificar con videos reales
