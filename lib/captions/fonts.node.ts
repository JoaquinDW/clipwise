/**
 * Worker-side half of the font registry: filesystem paths, and the preflight
 * that refuses to render rather than render in the wrong typeface.
 *
 * Never import this from a client component — it pulls in `fs`.
 */
import fs from 'fs';
import path from 'path';

import { CAPTION_FONTS, CAPTION_FONT_KEYS, getCaptionFont, type CaptionFontKey } from './fonts';

/**
 * Fonts ship inside `public/` so the browser and the worker read the same files.
 * `.dockerignore` excludes only `public/promo`, so they land in the image.
 */
export function captionFontsDir(): string {
  return path.join(process.cwd(), 'public', 'fonts', 'captions');
}

export function captionFontPath(key: CaptionFontKey): string {
  return path.join(captionFontsDir(), getCaptionFont(key).file);
}

/**
 * Verify every font a render could ask for is present on disk.
 *
 * The bundled `@ffmpeg-installer` binary is built without `--enable-fontconfig`,
 * so libass falls back to its directory provider and finds nothing outside the
 * `fontsdir` we hand it. A missing file there does not error — it renders in a
 * default face, or as nothing at all. Failing the job is the honest outcome.
 */
export function assertCaptionFontsPresent(): void {
  const dir = captionFontsDir();
  const missing = CAPTION_FONT_KEYS.filter((key) => !fs.existsSync(captionFontPath(key)));

  if (missing.length > 0) {
    throw new Error(
      `Caption fonts missing from ${dir}: ${missing
        .map((key) => CAPTION_FONTS[key].file)
        .join(', ')}. Captions cannot be rendered in the correct typeface.`
    );
  }
}

let verified = false;

/** Same check, done once per process. */
export function ensureCaptionFonts(): string {
  if (!verified) {
    assertCaptionFontsPresent();
    verified = true;
  }
  return captionFontsDir();
}
