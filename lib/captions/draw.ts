/**
 * Canvas2D caption drawing — the one renderer the browser and the worker share.
 *
 * The editor draws this onto a `<canvas>` over the video; the export draws it
 * with Skia into PNG keyframes that ffmpeg overlays. Same function, same
 * arithmetic, so the preview is not an approximation of the export — it is the
 * export, at a different scale.
 *
 * Everything is in composition px. Scaling is the caller's job: set a transform
 * before calling, or size the canvas to the composition and scale it with CSS.
 */

import type { CaptionFrame, LaidOutWord, TextMeasurer } from './layout';
import { captionFontShorthand, getCaptionFont } from './fonts';
import type { CaptionPreset } from './presets';

/**
 * The slice of Canvas2D used here, declared structurally so the same code
 * typechecks against the browser's `CanvasRenderingContext2D` and Skia's.
 */
export interface CaptionCanvasContext {
  font: string;
  // `unknown` rather than `string`: both the DOM and Skia widen these to accept
  // gradients and patterns, with incompatible class types for each. Only strings
  // are ever assigned here, and nothing reads them back.
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineJoin: string;
  lineCap: string;
  textBaseline: string;
  textAlign: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  measureText(text: string): { width: number };
  fillText(text: string, x: number, y: number): void;
  strokeText(text: string, x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
  fill(): void;
  stroke(): void;
  save(): void;
  restore(): void;
}

/**
 * Put the context in the exact state layout measured in.
 *
 * Measuring and drawing must agree to the pixel, so both go through this. A
 * measurement taken at a different font than the one drawn is how text ends up
 * overflowing the box that was reserved for it.
 */
export function setCaptionFont(
  ctx: CaptionCanvasContext,
  preset: CaptionPreset,
  fontSize: number
): void {
  ctx.font = captionFontShorthand(preset.typography.font, fontSize);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

/**
 * Letter spacing is applied by hand rather than through `ctx.letterSpacing`.
 *
 * That property is unevenly supported — missing in some browsers and some Skia
 * builds — and an assignment that silently no-ops on one side but not the other
 * is precisely the kind of divergence this system exists to remove. Doing the
 * arithmetic ourselves makes the result identical everywhere, at the cost of
 * kerning, which explicit tracking overrides anyway.
 */
function spacingFor(preset: CaptionPreset, fontSize: number): number {
  const { letterSpacing } = preset.typography;
  if (!letterSpacing) return 0;
  // letterSpacing is authored against the preset's own size; scale with S/M/L.
  return letterSpacing * (fontSize / preset.typography.fontSize);
}

function measureSpaced(ctx: CaptionCanvasContext, text: string, spacing: number): number {
  const base = ctx.measureText(text).width;
  if (!spacing) return base;
  return base + spacing * Math.max(0, [...text].length - 1);
}

function drawSpaced(
  ctx: CaptionCanvasContext,
  text: string,
  x: number,
  y: number,
  spacing: number,
  mode: 'fill' | 'stroke'
): void {
  if (!spacing) {
    if (mode === 'fill') ctx.fillText(text, x, y);
    else ctx.strokeText(text, x, y);
    return;
  }

  let cursor = x;
  for (const char of text) {
    if (mode === 'fill') ctx.fillText(char, cursor, y);
    else ctx.strokeText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
}

/**
 * A measurer bound to this context, preset and size — the function `layout.ts`
 * needs. Sets the font as a side effect so callers cannot forget to.
 */
export function createMeasurer(
  ctx: CaptionCanvasContext,
  preset: CaptionPreset,
  fontSize: number
): TextMeasurer {
  setCaptionFont(ctx, preset, fontSize);
  const spacing = spacingFor(preset, fontSize);
  return (text: string) => measureSpaced(ctx, text, spacing);
}

/**
 * Ascent as a fraction of font size, measured from the real font.
 *
 * Baseline placement drifts visibly between a serif and a heavy display face,
 * so it is measured rather than assumed.
 */
export function measureAscentRatio(
  ctx: CaptionCanvasContext,
  preset: CaptionPreset,
  fontSize: number
): number | undefined {
  setCaptionFont(ctx, preset, fontSize);
  const metrics = ctx.measureText('Hxg') as {
    width: number;
    actualBoundingBoxAscent?: number;
    fontBoundingBoxAscent?: number;
  };
  const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
  if (!ascent || !Number.isFinite(ascent)) return undefined;
  return ascent / fontSize;
}

function roundedRectPath(
  ctx: CaptionCanvasContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function clearShadow(ctx: CaptionCanvasContext): void {
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function applyShadow(ctx: CaptionCanvasContext, preset: CaptionPreset, scale: number): void {
  if (!preset.shadow || !preset.colors.shadow) {
    clearShadow(ctx);
    return;
  }
  ctx.shadowColor = preset.colors.shadow;
  ctx.shadowBlur = preset.shadow.blur * scale;
  ctx.shadowOffsetX = preset.shadow.offsetX * scale;
  ctx.shadowOffsetY = preset.shadow.offsetY * scale;
}

/**
 * Draw one caption frame. The caller clears the canvas first.
 *
 * Word order is drawing order, and every word is drawn in the same three passes
 * (background, then stroke, then fill) so a stroke can never land on top of a
 * neighbour's glyphs.
 */
export function drawCaptionFrame(ctx: CaptionCanvasContext, frame: CaptionFrame): void {
  const { preset, fontSize, words } = frame;
  const scale = fontSize / preset.typography.fontSize;
  const spacing = spacingFor(preset, fontSize);

  ctx.save();
  setCaptionFont(ctx, preset, fontSize);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Pass 1 — background boxes, under everything.
  if (preset.highlight.mode === 'background' && preset.colors.activeBackground) {
    const padX = (preset.background?.paddingX ?? 0) * scale;
    const padY = (preset.background?.paddingY ?? 0) * scale;
    const radius = (preset.background?.borderRadius ?? 0) * scale;

    clearShadow(ctx);
    ctx.fillStyle = preset.colors.activeBackground;
    for (const word of words) {
      if (!word.active) continue;
      roundedRectPath(
        ctx,
        word.x - padX,
        word.y - padY,
        word.width + padX * 2,
        word.height + padY * 2,
        radius
      );
      ctx.fill();
    }
  }

  // Pass 2 — glyphs.
  for (const word of words) {
    const baselineY = word.y + word.baseline;

    // A word sitting on its highlight box needs neither stroke nor shadow: the
    // box already separates it from the video, and both would only close up the
    // glyphs. Viral strokes in the same black its active text is set in, so
    // stroking there erases the word entirely.
    const onChip =
      word.active &&
      preset.highlight.mode === 'background' &&
      Boolean(preset.colors.activeBackground);

    if (onChip) {
      clearShadow(ctx);
    } else if (preset.stroke && preset.colors.stroke) {
      applyShadow(ctx, preset, scale);
      ctx.strokeStyle = preset.colors.stroke;
      // Canvas strokes centred on the outline, so half of it eats into the
      // glyph; doubling keeps the visible weight equal to the authored width.
      ctx.lineWidth = preset.stroke.width * scale * 2;
      drawSpaced(ctx, word.text, word.x, baselineY, spacing, 'stroke');
      clearShadow(ctx);
    } else {
      applyShadow(ctx, preset, scale);
    }

    ctx.fillStyle = activeColor(preset, word);
    drawSpaced(ctx, word.text, word.x, baselineY, spacing, 'fill');
    clearShadow(ctx);
  }

  // Pass 3 — underline, which sits on the glyphs rather than under the box.
  if (preset.highlight.mode === 'underline') {
    ctx.strokeStyle = preset.colors.activeText ?? preset.colors.text;
    ctx.lineWidth = Math.max(1, fontSize * 0.06);
    for (const word of words) {
      if (!word.active) continue;
      const underlineY = word.y + word.baseline + fontSize * 0.14;
      ctx.beginPath();
      ctx.moveTo(word.x, underlineY);
      ctx.lineTo(word.x + word.width, underlineY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function activeColor(preset: CaptionPreset, word: LaidOutWord): string {
  if (!word.active) return preset.colors.text;
  if (preset.highlight.mode === 'none') return preset.colors.text;
  return preset.colors.activeText ?? preset.colors.text;
}

/** Family name a renderer must have available before drawing this preset. */
export function requiredFontFamily(preset: CaptionPreset): string {
  return getCaptionFont(preset.typography.font).family;
}
