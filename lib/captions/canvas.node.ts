/**
 * Skia canvas for the worker — the export half of the shared renderer.
 *
 * `drawCaptionFrame` is environment-agnostic; this supplies it with a context
 * and, crucially, with the same font files the browser loads over HTTP. Nothing
 * here decides how a caption looks.
 */
import { createCanvas, GlobalFonts, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';

import { CAPTION_FONT_KEYS, getCaptionFont } from './fonts';
import { captionFontPath, ensureCaptionFonts } from './fonts.node';
import { COMPOSITION_HEIGHT, COMPOSITION_WIDTH } from './presets';
import type { CaptionCanvasContext } from './draw';

let registered = false;

/**
 * Register every caption font with Skia under its real family name.
 *
 * Registering under the family from the font's own `name` table is what lets
 * `ctx.font` — built by the same `captionFontShorthand` the browser uses —
 * resolve to the same file on both sides.
 */
export function registerCaptionFonts(): void {
  if (registered) return;
  ensureCaptionFonts();

  for (const key of CAPTION_FONT_KEYS) {
    const font = getCaptionFont(key);
    const ok = GlobalFonts.registerFromPath(captionFontPath(key), font.family);
    if (!ok) {
      throw new Error(`Skia refused to register caption font ${font.file} as "${font.family}"`);
    }
  }

  registered = true;
}

export interface CaptionCanvas {
  canvas: Canvas;
  ctx: CaptionCanvasContext;
  raw: SKRSContext2D;
}

/** A transparent composition-sized canvas with the fonts already registered. */
export function createCaptionCanvas(
  width = COMPOSITION_WIDTH,
  height = COMPOSITION_HEIGHT
): CaptionCanvas {
  registerCaptionFonts();
  const canvas = createCanvas(width, height);
  const raw = canvas.getContext('2d');
  return { canvas, ctx: raw as unknown as CaptionCanvasContext, raw };
}
