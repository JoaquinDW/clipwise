/**
 * The font metrics in `fonts.ts` are hand-copied constants, and they are load
 * bearing: get `sizeRatio` wrong and the ASS burn renders at a different size
 * than the preview, which is the exact class of bug this system exists to
 * prevent. This re-derives them from the font files themselves, so swapping a
 * font file without updating the table fails here instead of in someone's
 * downloaded clip.
 */
import fs from 'fs';
import { describe, expect, it } from 'vitest';

import { CAPTION_FONTS, CAPTION_FONT_KEYS } from '../fonts';
import { captionFontPath } from '../fonts.node';

/** Minimal TrueType/OpenType table reader — enough for `head` and `OS/2`. */
function readMetrics(file: string) {
  const b = fs.readFileSync(file);
  const tableCount = b.readUInt16BE(4);

  const tables: Record<string, number> = {};
  for (let i = 0; i < tableCount; i++) {
    const offset = 12 + i * 16;
    tables[b.toString('ascii', offset, offset + 4)] = b.readUInt32BE(offset + 8);
  }

  const unitsPerEm = b.readUInt16BE(tables['head'] + 18);
  // libass sizes text from OS/2 winAscent/winDescent, not hhea. For most faces
  // the two agree; Anton's differ by 15%.
  const winAscent = b.readUInt16BE(tables['OS/2'] + 74);
  const winDescent = b.readUInt16BE(tables['OS/2'] + 76);

  return {
    sizeRatio: (winAscent + winDescent) / unitsPerEm,
    ascentRatio: winAscent / unitsPerEm,
    descentRatio: winDescent / unitsPerEm,
  };
}

describe('caption font registry', () => {
  it.each(CAPTION_FONT_KEYS)('%s is present on disk', (key) => {
    expect(fs.existsSync(captionFontPath(key))).toBe(true);
  });

  it.each(CAPTION_FONT_KEYS)('%s metrics match the font file', (key) => {
    const actual = readMetrics(captionFontPath(key));
    const declared = CAPTION_FONTS[key].metrics;

    expect(declared.sizeRatio).toBeCloseTo(actual.sizeRatio, 3);
    expect(declared.ascentRatio).toBeCloseTo(actual.ascentRatio, 3);
    expect(declared.descentRatio).toBeCloseTo(actual.descentRatio, 3);
  });

  it('declares the family name the file actually carries', () => {
    // A wrong family here is invisible: libass falls back to another face
    // rather than failing, which is how the old presets asked for Impact and
    // silently got whatever the container had.
    const families = CAPTION_FONT_KEYS.map((key) => CAPTION_FONTS[key].family);
    expect(new Set(families).size).toBeGreaterThan(1);
    expect(families).toContain('Anton');
    expect(families).toContain('Archivo Black');
  });
});
