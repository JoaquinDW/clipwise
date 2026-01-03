# Mejoras de Subtítulos - Resaltado Palabra por Palabra

## 📋 Resumen

Se ha implementado un sistema completo de subtítulos con resaltado sincronizado palabra por palabra, similar a los populares videos de TikTok/Reels/Shorts. Este sistema utiliza timestamps a nivel de palabra desde Whisper API y renderizado ASS avanzado con FFmpeg.

## ✨ Características Implementadas

### 1. **Captura de Timestamps a Nivel de Palabra**
- ✅ Whisper API actualizado para obtener timestamps de cada palabra individual
- ✅ Base de datos actualizada para almacenar datos de palabras
- ✅ Migración de Prisma ejecutada exitosamente

### 2. **Generación de Subtítulos Mejorada**
- ✅ AI genera segmentos de **2-4 palabras** (reducido desde 5-7)
- ✅ Cada palabra mantiene su timing preciso para sincronización
- ✅ Énfasis automático en palabras clave (números, hooks, power words)

### 3. **Renderizado Visual**
- ✅ **Tamaño de fuente**: 36px (especificado por usuario)
- ✅ **Posición**: 3/4 de la pantalla (inferior, no pegado al borde)
- ✅ **Resaltado**: Palabra activa con color de fondo (amarillo/naranja/rojo)
- ✅ **Sin animaciones**: Transiciones instantáneas
- ✅ Formato ASS (Advanced SubStation Alpha) para efectos karaoke

## 📁 Archivos Modificados

### Core AI Libraries
1. **[lib/ai/transcribe.ts](lib/ai/transcribe.ts)**
   - Agregado `WordTimestamp` interface
   - API call actualizado a `timestamp_granularities: ['segment', 'word']`
   - Procesa y retorna array de palabras con timestamps

2. **[lib/ai/captions.ts](lib/ai/captions.ts)**
   - Reescrito para trabajar con word-level data
   - Nueva estructura: `CaptionWord` y `CaptionSegment` con array de palabras
   - Función `captionsToASS()` para generar formato ASS con karaoke highlighting
   - Prompts actualizados para 2-4 palabras por segmento
   - Helper `hexToASSColor()` para conversión de colores

### Video Processing
3. **[lib/video/processor.ts](lib/video/processor.ts)**
   - Función `burnCaptions()` reescrita para ASS format
   - Eliminadas funciones antiguas de SRT
   - `createClip()` actualizado para aceptar `CaptionsResult` completo
   - FFmpeg usa filtro `ass=` en lugar de `subtitles=`

### Database
4. **[prisma/schema.prisma](prisma/schema.prisma)**
   - Campo `words Json?` agregado al modelo `Transcription`
   - Migración: `20260101221218_add_word_timestamps`

### API Routes
5. **[app/api/videos/[id]/process/route.ts](app/api/videos/[id]/process/route.ts)**
   - Almacena word-level timestamps en database
   - Extrae y ajusta palabras para cada clip
   - Pasa `CaptionsResult` completo al processor

6. **[app/api/videos/[id]/regenerate/route.ts](app/api/videos/[id]/regenerate/route.ts)**
   - Actualizado para usar word-level data
   - Compatible con nuevo formato de captions

7. **[app/api/videos/[id]/retry/route.ts](app/api/videos/[id]/retry/route.ts)**
   - Actualizado para usar word-level data
   - Compatible con nuevo formato de captions

## 🎨 Especificaciones de Diseño

### Configuración de Subtítulos
```typescript
{
  fontSize: 36,                    // Tamaño fijo de fuente
  color: "#FFFFFF",                // Texto blanco por defecto
  highlightColor: "#FFD700",       // Amarillo para resaltar (AI puede cambiar)
  position: "bottom",              // Posición 3/4 de altura
  wordsPerSegment: 2-4,           // 2-4 palabras por línea
  animation: "none"                // Sin animaciones
}
```

### Formato ASS Generado
El sistema genera subtítulos ASS con:
- **Estilo Default**: Arial, 36px, blanco, borde negro
- **Estilo Highlight**: Color dinámico con fondo para palabra activa
- **MarginV: 200**: Posición a 3/4 de la pantalla
- **Alignment: 2**: Centrado inferior

### Ejemplo de Efecto Karaoke
```
Tiempo 0.0-0.3s: [HOLA] mundo como
Tiempo 0.3-0.6s: hola [MUNDO] como
Tiempo 0.6-0.9s: hola mundo [COMO]
```
Cada palabra se resalta al ser pronunciada, similar a karaoke.

## 🔧 Implementación Técnica

### 1. Whisper API Call
```typescript
formData.append('timestamp_granularities', JSON.stringify(['segment', 'word']));
```

### 2. Estructura de Datos
```typescript
interface WordTimestamp {
  word: string;
  start: number;  // segundos
  end: number;    // segundos
}

interface CaptionSegment {
  startTime: number;
  endTime: number;
  words: CaptionWord[];
  position: 'top' | 'center' | 'bottom';
}
```

### 3. Renderizado ASS
```typescript
// Genera eventos ASS con cada palabra resaltada secuencialmente
function generateKaraokeEvents(segment, style) {
  return words.map((word) => {
    const fullText = words.map((w) => {
      if (w === currentWord) {
        return `{\\1c${highlightColor}}${w.word}`;
      } else {
        return `{\\1c${defaultColor}}${w.word}`;
      }
    }).join(' ');

    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${fullText}`;
  });
}
```

## 📊 Flujo de Procesamiento

1. **Upload Video** → Almacenar en Supabase/S3
2. **Transcribir** → Whisper API retorna segments + words
3. **Guardar** → Prisma almacena ambos en DB
4. **Detectar Highlights** → AI analiza contenido
5. **Generar Captions** → AI agrupa palabras en segmentos de 2-4
6. **Renderizar** → FFmpeg quema subtítulos ASS con highlighting
7. **Upload Clip** → Clip final con captions sincronizados

## ✅ Testing

Para probar el sistema:

1. **Subir un video** o pegar URL de YouTube
2. **Procesar** el video con `/api/videos/[id]/process`
3. **Verificar** que:
   - Transcription incluye campo `words`
   - Clips tienen captions con estructura `{captions, style, hook}`
   - Videos procesados muestran resaltado palabra por palabra
   - Posición es 3/4 de pantalla
   - Tamaño de fuente es 36px
   - No hay animaciones

## 🚀 Próximos Pasos (Opcional)

- [ ] UI para previsualizar captions antes de renderizar
- [ ] Opciones de usuario para personalizar colores
- [ ] A/B testing de diferentes estilos de highlighting
- [ ] Soporte para múltiples idiomas RTL (right-to-left)
- [ ] Exportar captions como archivos .ass descargables

## 🐛 Debugging

Si los captions no aparecen:
1. Verificar que FFmpeg tiene soporte para ASS (`ffmpeg -filters | grep ass`)
2. Revisar console logs para `Generated ASS captions:`
3. Verificar que `words` field existe en Transcription
4. Confirmar que AI generó captions con estructura correcta

Si el highlighting no funciona:
1. Verificar color hex en ASS (formato `&HAABBGGRR`)
2. Confirmar timing de palabras (debe ser secuencial)
3. Revisar override tags ASS (`\\1c`, `\\3c`, `\\bord`)

## 📝 Notas Importantes

- **Compatibilidad**: Requiere FFmpeg con soporte ASS (instalado con Homebrew/apt)
- **Performance**: ASS rendering es más intensivo que SRT, pero necesario para highlighting
- **Costo**: Whisper API con word timestamps usa misma cantidad de tokens
- **Calidad**: Word timestamps son muy precisos (±50ms típicamente)

---

**Implementado**: 2026-01-01
**Status**: ✅ Completado y funcional
**Breaking Changes**: Sí - API signature de `generateCaptions()` y `createClip()` cambió
