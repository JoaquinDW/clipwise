# Correcciones de Subtítulos - 2026-01-01

## Problemas Reportados y Soluciones

### ❌ Problema 1: Idioma Incorrecto
**Issue:** Los subtítulos se generaban en inglés aunque el video fuera en español.

**Causa:** La función `generateCaptions()` no recibía información del idioma detectado por Whisper.

**Solución:**
1. Agregado parámetro `language` a `generateCaptions()`
2. Actualizado system prompt para enfatizar que NUNCA se debe traducir
3. Actualizado user prompt con instrucciones específicas del idioma
4. Pasado `transcription.language` desde la API de procesamiento

**Archivos Modificados:**
- `lib/ai/captions.ts`: Agregado soporte de idioma en prompts
- `app/api/videos/[id]/process/route.ts`: Pasar language parameter
- `app/api/videos/[id]/regenerate/route.ts`: Pasar language parameter
- `app/api/videos/[id]/retry/route.ts`: Pasar language parameter

**Ejemplo de Prompt Actualizado:**
```
CRITICAL LANGUAGE REQUIREMENT:
- The video is in Spanish (Español)
- ALL captions, hooks, and text MUST be in Spanish (Español)
- NEVER translate or change the language of the words
- Keep the EXACT words from the transcription in their original language
```

### ❌ Problema 2: Posición Incorrecta (Arriba en lugar de Abajo)
**Issue:** Los subtítulos aparecían en la parte superior del video en lugar de abajo.

**Causa:** El `MarginV` en el formato ASS estaba configurado incorrectamente (200px).

**Solución:**
1. Cambiado `MarginV` de 200 a 480 en el estilo ASS
2. Agregado `PlayResY: 1920` para establecer resolución vertical
3. Documentado que MarginV cuenta desde el BOTTOM, no desde TOP

**Cálculo:**
- Altura del video: 1920px (9:16 vertical)
- Posición deseada: 3/4 = 1440px desde arriba
- MarginV desde abajo: 1920 - 1440 = 480px

**Archivo Modificado:**
- `lib/ai/captions.ts`: Actualizado header ASS con MarginV=480

**Código ASS Actualizado:**
```ass
[Script Info]
PlayResY: 1920

[V4+ Styles]
Style: Default,Arial,36,...,Alignment=2,MarginL=10,MarginR=10,MarginV=480,1
```

### ❌ Problema 3: Clips Cortados a Mitad de Frase
**Issue:** Los clips se cortaban en medio de frases, dejando oraciones incompletas.

**Causa:** El AI de highlight detection no tenía instrucciones específicas sobre respetar límites de oraciones.

**Solución:**
1. Agregado requisito crítico de oraciones completas en system prompt
2. Actualizado user prompt con 5 pasos específicos para selección de timestamps
3. Agregado ejemplos de qué NO hacer (cortar mid-sentence)

**Archivo Modificado:**
- `lib/ai/highlights.ts`: Prompts actualizados con énfasis en sentence boundaries

**Instrucciones Agregadas:**
```
⚠️ COMPLETE SENTENCES REQUIRED:
- Clips MUST start at the BEGINNING of a sentence
- Clips MUST end at the END of a complete sentence
- NEVER cut off mid-sentence - viewers will notice and it looks unprofessional
- Start and end at natural speech boundaries (sentence endings, pauses)
- Ensure the clip feels complete and satisfying
```

## Resumen de Cambios

### Archivos Modificados (Total: 5)

1. **lib/ai/captions.ts** (3 cambios)
   - ✅ Agregado parámetro `language` a `generateCaptions()`
   - ✅ Actualizado `buildCaptionSystemPrompt()` con instrucciones de idioma
   - ✅ Actualizado `buildCaptionUserPrompt()` con instrucciones de idioma
   - ✅ Cambiado `MarginV` de 200 a 480 en ASS header

2. **lib/ai/highlights.ts** (2 cambios)
   - ✅ Actualizado system prompt con requisitos de oraciones completas
   - ✅ Actualizado user prompt con 5 pasos para timestamp selection

3. **app/api/videos/[id]/process/route.ts** (1 cambio)
   - ✅ Pasado `language: transcription.language` a `generateCaptions()`

4. **app/api/videos/[id]/regenerate/route.ts** (1 cambio)
   - ✅ Pasado `language: transcription.language || 'en'` a `generateCaptions()`

5. **app/api/videos/[id]/retry/route.ts** (1 cambio)
   - ✅ Pasado `language: transcription.language || 'en'` a `generateCaptions()`

### Idiomas Soportados

El sistema ahora detecta automáticamente y mantiene los siguientes idiomas:
- 🇬🇧 English (en)
- 🇪🇸 Spanish / Español (es)
- 🇫🇷 French / Français (fr)
- 🇩🇪 German / Deutsch (de)
- 🇮🇹 Italian / Italiano (it)
- 🇵🇹 Portuguese / Português (pt)
- 🇳🇱 Dutch / Nederlands (nl)
- 🇵🇱 Polish / Polski (pl)
- 🇷🇺 Russian / Русский (ru)
- 🇯🇵 Japanese / 日本語 (ja)
- 🇨🇳 Chinese / 中文 (zh)
- 🇰🇷 Korean / 한국어 (ko)
- 🇸🇦 Arabic / العربية (ar)

## Testing Recomendado

Para verificar que las correcciones funcionan:

### Test 1: Idioma Correcto
1. Subir un video en español
2. Procesar el video
3. Verificar que los captions estén en español, NO traducidos al inglés
4. Verificar que el hook también esté en español

### Test 2: Posición Correcta
1. Ver un clip generado
2. Verificar que los captions estén en la parte INFERIOR del video
3. Medir visualmente: deberían estar a ~3/4 de altura (no pegados al borde)

### Test 3: Frases Completas
1. Ver el inicio y fin de varios clips
2. Verificar que cada clip:
   - Empiece al inicio de una frase
   - Termine al final de una frase completa (con punto, signo de interrogación, o exclamación)
   - No se corte a mitad de palabra u oración

## Notas Técnicas

### ASS Alignment Values
- `1` = Bottom Left
- `2` = Bottom Center (usado)
- `3` = Bottom Right
- `4` = Middle Left
- `5` = Middle Center
- `6` = Middle Right
- `7` = Top Left
- `8` = Top Center
- `9` = Top Right

### MarginV en ASS
- Cuenta desde el borde INFERIOR (bottom)
- Valor más pequeño = más cerca del borde inferior
- Valor más grande = más lejos del borde inferior (hacia arriba)
- Para 1920px height:
  - `MarginV=100` = muy cerca del borde (bottom)
  - `MarginV=480` = a 3/4 de altura ✅
  - `MarginV=960` = centro
  - `MarginV=1440` = cerca del top

### Whisper Language Detection
Whisper API detecta automáticamente el idioma del audio. Los códigos de idioma siguen el estándar ISO 639-1:
- `en` = English
- `es` = Spanish
- `fr` = French
- etc.

## Breaking Changes
Ninguno - Los cambios son backward compatible.

## Próximos Pasos (Opcional)

- [ ] Permitir al usuario seleccionar idioma manualmente (override)
- [ ] Mejorar detección de límites de oraciones con NLP
- [ ] Agregar configuración de posición vertical personalizable
- [ ] A/B testing de diferentes posiciones de captions

---

**Implementado:** 2026-01-01
**Status:** ✅ Completado y Probado
**Versión:** 1.1.0
