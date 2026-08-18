/**
 * The layout engine is the single answer to "what is on screen now" for both
 * the preview and the export, so its behaviour at the awkward moments — the
 * pause between two words, the boundary between two pages — is what keeps the
 * two renderers agreeing.
 */
import { describe, expect, it } from 'vitest';

import {
  activeWordIndex,
  buildCaptionPages,
  captionFrameAt,
  captionKeyframes,
  flattenCaptionWords,
  layoutPage,
  pageWindow,
  type CaptionWord,
} from '../layout';
import { COMPOSITION_HEIGHT, COMPOSITION_WIDTH, getCaptionPreset } from '../presets';

/** Deterministic stand-in for a font: every glyph is half an em wide. */
const measure = (text: string) => text.length * 20;

const words: CaptionWord[] = [
  { text: 'one', start: 0.0, end: 0.4 },
  { text: 'two', start: 0.5, end: 0.9 }, // 0.1s gap before this
  { text: 'three', start: 0.9, end: 1.3 },
  { text: 'four', start: 3.0, end: 3.4 }, // long gap: new page
  { text: 'five', start: 3.4, end: 3.8 },
];

const preset = getCaptionPreset('classic');
const ctx = { preset, measure, captionSize: 'medium' as const };

describe('grouping', () => {
  it('pages by the preset, not by the stored segments', () => {
    const pages = buildCaptionPages(words, preset);
    expect(preset.layout.wordsPerPage).toBe(3);
    expect(pages.map((p) => p.words.map((w) => w.text))).toEqual([
      ['one', 'two', 'three'],
      ['four', 'five'],
    ]);
  });

  it('flattens stored captions in time order and drops blanks', () => {
    const flat = flattenCaptionWords({
      captions: [
        { words: [{ word: 'b', startTime: 1, endTime: 2 }] },
        { words: [{ word: '  ', startTime: 2, endTime: 3 }] },
        { words: [{ word: 'a', startTime: 0, endTime: 1 }] },
      ],
    });
    expect(flat.map((w) => w.text)).toEqual(['a', 'b']);
  });

  it('is deterministic — the same words always give the same pages', () => {
    const a = buildCaptionPages(words, preset);
    const b = buildCaptionPages([...words], preset);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('active word', () => {
  const page = buildCaptionPages(words, preset)[0];

  it('picks the word containing the time', () => {
    expect(activeWordIndex(page, 0.2)).toBe(0);
    expect(activeWordIndex(page, 1.0)).toBe(2);
  });

  it('holds the previous word through a gap between words', () => {
    // 0.45s falls between "one" ending and "two" starting. The old preview
    // returned -1 here and rendered a page with nothing highlighted.
    expect(activeWordIndex(page, 0.45)).toBe(0);
  });

  it('has no active word before the page starts', () => {
    expect(activeWordIndex(page, -1)).toBe(-1);
  });
});

describe('visibility', () => {
  const pages = buildCaptionPages(words, preset);

  it('holds a page past its last word, capped so silence clears the screen', () => {
    const first = pageWindow(pages, 0);
    expect(first.start).toBe(0);
    // Last word ends at 1.3; the next page is far away, so the cap applies.
    expect(first.end).toBeCloseTo(2.5, 5);
  });

  it('shows nothing in a long gap between pages', () => {
    expect(captionFrameAt(pages, 2.7, ctx)).toBeNull();
  });

  it('never shows two pages at once', () => {
    for (let t = 0; t < 4; t += 0.05) {
      const visible = pages.filter((_, i) => {
        const w = pageWindow(pages, i);
        return t >= w.start && t < w.end;
      });
      expect(visible.length).toBeLessThanOrEqual(1);
    }
  });
});

describe('geometry', () => {
  it('anchors a bottom caption by its lower edge', () => {
    const page = buildCaptionPages(words, preset)[0];
    const laid = layoutPage(page, { ...ctx, captionPosition: 'bottom' });
    const bottom = Math.max(...laid.map((w) => w.y + w.height));
    expect(bottom).toBeCloseTo(0.85 * COMPOSITION_HEIGHT, 5);
  });

  it('centres a middle caption on the composition', () => {
    const page = buildCaptionPages(words, preset)[0];
    const laid = layoutPage(page, { ...ctx, captionPosition: 'center' });
    const top = Math.min(...laid.map((w) => w.y));
    const bottom = Math.max(...laid.map((w) => w.y + w.height));
    expect((top + bottom) / 2).toBeCloseTo(COMPOSITION_HEIGHT / 2, 5);
  });

  it('centres each line horizontally', () => {
    const page = buildCaptionPages(words, preset)[0];
    const laid = layoutPage(page, ctx);
    const left = Math.min(...laid.map((w) => w.x));
    const right = Math.max(...laid.map((w) => w.x + w.width));
    expect((left + right) / 2).toBeCloseTo(COMPOSITION_WIDTH / 2, 5);
  });

  it('wraps rather than overflowing the max width', () => {
    const long = Array.from({ length: 3 }, (_, i) => ({
      text: 'pneumonoultramicroscopic',
      start: i * 0.5,
      end: i * 0.5 + 0.5,
    }));
    const page = buildCaptionPages(long, preset)[0];
    const laid = layoutPage(page, ctx);

    const rows = new Set(laid.map((w) => w.y));
    expect(rows.size).toBeGreaterThan(1);

    for (const row of rows) {
      const inRow = laid.filter((w) => w.y === row);
      const width = Math.max(...inRow.map((w) => w.x + w.width)) - Math.min(...inRow.map((w) => w.x));
      expect(width).toBeLessThanOrEqual(COMPOSITION_WIDTH * preset.layout.maxWidth + 0.01);
    }
  });

  it('does not move words when the highlight moves', () => {
    const pages = buildCaptionPages(words, preset);
    const early = captionFrameAt(pages, 0.1, ctx)!;
    const later = captionFrameAt(pages, 1.0, ctx)!;

    expect(early.words.map((w) => [w.x, w.y])).toEqual(later.words.map((w) => [w.x, w.y]));
    expect(early.words.findIndex((w) => w.active)).not.toBe(
      later.words.findIndex((w) => w.active)
    );
  });
});

describe('keyframes', () => {
  const pages = buildCaptionPages(words, preset);
  const frames = captionKeyframes(pages, ctx);

  it('emits one frame per word', () => {
    expect(frames).toHaveLength(words.length);
    expect(frames.every((f) => f.words.filter((w) => w.active).length === 1)).toBe(true);
  });

  it('tiles each page without gaps or overlaps', () => {
    const firstPage = frames.slice(0, 3);
    for (let i = 1; i < firstPage.length; i++) {
      expect(firstPage[i].start).toBeCloseTo(firstPage[i - 1].end, 5);
    }
    expect(firstPage[0].start).toBeCloseTo(pageWindow(pages, 0).start, 5);
    expect(firstPage.at(-1)!.end).toBeCloseTo(pageWindow(pages, 0).end, 5);
  });

  it('agrees with what the preview would draw at the same instant', () => {
    // This is the property the whole system rests on: sampling the export's
    // keyframes must give the same picture as asking for the live frame.
    for (const t of [0.1, 0.45, 0.6, 1.0, 1.4, 3.1, 3.5]) {
      const live = captionFrameAt(pages, t, ctx);
      const baked = frames.find((f) => t >= f.start && t < f.end) ?? null;

      expect(baked?.words.map((w) => [w.text, w.active, w.x, w.y]) ?? null).toEqual(
        live?.words.map((w) => [w.text, w.active, w.x, w.y]) ?? null
      );
    }
  });
});
