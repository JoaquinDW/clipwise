import { describe, expect, it } from 'vitest';

import { sliceCaptions } from '../caption-slice';
import type { CaptionsResult } from '../captions';

function captions(): CaptionsResult {
  return {
    captions: [
      {
        startTime: 0,
        endTime: 2,
        position: 'bottom',
        words: [
          { word: 'one', startTime: 0.0, endTime: 1.0, emphasis: false },
          { word: 'two', startTime: 1.0, endTime: 2.0, emphasis: false },
        ],
      },
      {
        startTime: 2,
        endTime: 4,
        position: 'bottom',
        words: [
          { word: 'three', startTime: 2.0, endTime: 3.0, emphasis: false },
          { word: 'four', startTime: 3.0, endTime: 4.0, emphasis: false },
        ],
      },
    ],
    style: { fontSize: 36, color: '#FFFFFF', highlightColor: '#FFD700' },
    hook: '',
  };
}

describe('sliceCaptions', () => {
  it('shifts times onto the trimmed range', () => {
    const out = sliceCaptions(captions(), 2, 2);
    expect(out.captions).toHaveLength(1);
    expect(out.captions[0].words.map((w) => w.word)).toEqual(['three', 'four']);
    expect(out.captions[0].words[0].startTime).toBeCloseTo(0, 5);
  });

  it('drops segments outside the range', () => {
    const out = sliceCaptions(captions(), 0, 2);
    expect(out.captions.flatMap((s) => s.words.map((w) => w.word))).toEqual(['one', 'two']);
  });

  it('clamps a word the cut lands in the middle of', () => {
    // A cut at 0.5s leaves "one" starting at -0.5. A negative timestamp makes
    // the ASS renderer emit a malformed cue that libass silently drops, so the
    // first word of a trimmed clip would just not appear.
    const out = sliceCaptions(captions(), 0.5, 2);
    const all = out.captions.flatMap((s) => s.words);

    expect(all.every((w) => w.startTime >= 0)).toBe(true);
    expect(all.every((w) => w.endTime <= 2)).toBe(true);
    expect(all[0].word).toBe('one');
    expect(all[0].startTime).toBe(0);
  });

  it('keeps every word inside the segment that holds it', () => {
    const out = sliceCaptions(captions(), 1.5, 1.5);
    for (const segment of out.captions) {
      for (const word of segment.words) {
        expect(word.startTime).toBeGreaterThanOrEqual(segment.startTime - 1e-9);
        expect(word.endTime).toBeLessThanOrEqual(segment.endTime + 1e-9);
      }
    }
  });

  it('never emits an empty segment', () => {
    for (const offset of [0, 0.5, 1, 2, 3, 3.9]) {
      const out = sliceCaptions(captions(), offset, 1);
      expect(out.captions.every((s) => s.words.length > 0)).toBe(true);
    }
  });
});
