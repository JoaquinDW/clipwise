/**
 * Caption fonts — the one place that knows which font FILE a preset renders in.
 *
 * Presets used to name CSS stacks like `Impact, Arial Black, sans-serif`. Nothing
 * enforced those: the browser fell back to whatever the OS had (Impact and Arial
 * Black exist on neither Linux nor Android), and the worker container had no
 * fonts installed at all. Preview and export could not agree on a typeface
 * because neither side knew which typeface it was asking for.
 *
 * So a font is a file, not a stack. The files live in `public/fonts/captions/`
 * — one copy, fetched over HTTP by the browser and read off disk by the worker.
 *
 * `family` is the font's *internal* family name, read out of its `name` table.
 * That exact string is what libass matches on and what `ctx.font` resolves, so
 * it must not be prettified.
 *
 * This module is isomorphic. Anything touching `fs` belongs in `fonts.node.ts`.
 */

export type CaptionFontKey =
  | 'inter'
  | 'inter-bold'
  | 'anton'
  | 'archivo-black'
  | 'source-serif';

export interface CaptionFont {
  /** Internal family name from the font's `name` table (id 1). */
  family: string;
  /** CSS/OS-2 weight. Pairs with `family` to select a file. */
  weight: number;
  /** Filename inside the caption font directory. */
  file: string;
  /** True when the file's own OS/2 table marks it bold — libass keys off this. */
  bold: boolean;
  /**
   * Vertical metrics from the font's `head` and OS/2 tables, as fractions of
   * the em. libass sizes from OS/2 winAscent/winDescent, not hhea — for most
   * faces the two agree, but Anton's differ by 15%, which is measurable in the
   * burned frame. These exist to reconcile two different definitions of "font size":
   * `ctx.font = "53px X"` sets the *em square* to 53px, while ASS `Fontsize`
   * sets the *ascender-to-descender span*. Feeding the same number to both makes
   * ASS render smaller by exactly `1 / sizeRatio` — for Anton that is a third
   * too small, which is what made the burned file not match the preview.
   *
   * Verified against the font files by lib/captions/__tests__/fonts.test.ts.
   */
  metrics: {
    /** (ascender - descender) / unitsPerEm. Multiply an em size to get Fontsize. */
    sizeRatio: number;
    /** ascender / unitsPerEm. */
    ascentRatio: number;
    /** -descender / unitsPerEm. */
    descentRatio: number;
  };
}

/** Served at `/fonts/captions`, and copied into the worker image under `public/`. */
export const CAPTION_FONTS_PUBLIC_PATH = '/fonts/captions';

export const CAPTION_FONTS: Record<CaptionFontKey, CaptionFont> = {
  inter: {
    family: 'Inter',
    weight: 400,
    file: 'Inter-Regular.ttf',
    bold: false,
    metrics: { sizeRatio: 1.21, ascentRatio: 0.9688, descentRatio: 0.2412 },
  },
  'inter-bold': {
    family: 'Inter',
    weight: 700,
    file: 'Inter-Bold.ttf',
    bold: true,
    metrics: { sizeRatio: 1.21, ascentRatio: 0.9688, descentRatio: 0.2412 },
  },
  anton: {
    // Anton ships one weight and is already display-heavy — this is the Impact seat.
    family: 'Anton',
    weight: 400,
    file: 'Anton-Regular.ttf',
    bold: false,
    metrics: { sizeRatio: 1.7334, ascentRatio: 1.4043, descentRatio: 0.3291 },
  },
  'archivo-black': {
    // The Arial Black seat: one very heavy weight, no bold variant.
    family: 'Archivo Black',
    weight: 400,
    file: 'ArchivoBlack-Regular.ttf',
    bold: false,
    metrics: { sizeRatio: 1.347, ascentRatio: 1.035, descentRatio: 0.312 },
  },
  'source-serif': {
    // Display optical size — captions are set large, so the text cut is too fine.
    family: 'Source Serif 4 Display',
    weight: 400,
    file: 'SourceSerif4-Display-Regular.otf',
    bold: false,
    metrics: { sizeRatio: 1.371, ascentRatio: 1.036, descentRatio: 0.335 },
  },
};

export const CAPTION_FONT_KEYS = Object.keys(CAPTION_FONTS) as CaptionFontKey[];

export function getCaptionFont(key: CaptionFontKey): CaptionFont {
  const font = CAPTION_FONTS[key];
  if (!font) throw new Error(`Unknown caption font: ${key}`);
  return font;
}

/** URL the browser fetches the file from. */
export function captionFontUrl(key: CaptionFontKey): string {
  return `${CAPTION_FONTS_PUBLIC_PATH}/${getCaptionFont(key).file}`;
}

/**
 * A `ctx.font` shorthand. Canvas2D needs the size baked in, so this takes one.
 *
 * Deliberately has no fallback family: a miss must render as tofu during
 * development rather than silently substituting a face, which is the exact
 * failure this module exists to prevent.
 */
export function captionFontShorthand(key: CaptionFontKey, sizePx: number): string {
  const font = getCaptionFont(key);
  return `${font.weight} ${sizePx}px "${font.family}"`;
}

/**
 * Load a font into `document.fonts` and resolve once it can actually be drawn.
 *
 * Canvas ignores CSS `@font-face` that has not finished loading — it silently
 * draws in the fallback and never repaints. So the preview must await this
 * before its first frame.
 */
const browserLoads = new Map<CaptionFontKey, Promise<void>>();

export function loadCaptionFont(key: CaptionFontKey): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  const cached = browserLoads.get(key);
  if (cached) return cached;

  const font = getCaptionFont(key);
  const load = (async () => {
    const face = new FontFace(font.family, `url(${captionFontUrl(key)})`, {
      weight: String(font.weight),
      display: 'block',
    });
    await face.load();
    document.fonts.add(face);
  })();

  browserLoads.set(key, load);
  return load;
}

export function loadAllCaptionFonts(): Promise<void[]> {
  return Promise.all(CAPTION_FONT_KEYS.map(loadCaptionFont));
}
