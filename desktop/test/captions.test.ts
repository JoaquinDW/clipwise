import { describe, expect, it } from 'vitest';
import { buildCaptions, clipWords } from '../src/engine/captions';

const words = [
  { word: 'a', start: 9.5, end: 10.2 },
  { word: 'b', start: 10.3, end: 10.6 },
  { word: 'c', start: 10.7, end: 11 },
  { word: 'd', start: 11.1, end: 11.4 },
  { word: 'e', start: 20, end: 20.5 },
];

describe('clipWords', () => {
  it('keeps the words inside the clip, re-timed and clamped to it', () => {
    const inside = clipWords(words, 10, 12);
    expect(inside.map((w) => w.word)).toEqual(['a', 'b', 'c', 'd']);
    expect(inside[0]).toEqual({ word: 'a', start: 0, end: expect.closeTo(0.2, 5) });
  });
});

describe('buildCaptions', () => {
  it('groups words and carries the preset look and the hook', () => {
    const captions = buildCaptions(clipWords(words, 10, 12), { style: 'bold', hook: 'Hook' });
    expect(captions.captions.map((s) => s.words.map((w) => w.word))).toEqual([['a', 'b', 'c'], ['d']]);
    expect(captions.hook).toBe('Hook');
    expect(captions.style.fontSize).toBeGreaterThan(0);
  });

  it('returns no segments for a silent clip', () => {
    expect(buildCaptions([], { style: 'classic' }).captions).toEqual([]);
  });
});
