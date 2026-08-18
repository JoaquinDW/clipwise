import { describe, expect, it } from 'vitest';

import { buildCaptionPages, captionKeyframes, type CaptionWord } from '../layout';
import { formatASSTime, renderFramesToASS, toASSColour } from '../renderers/ass';
import { COMPOSITION_HEIGHT, COMPOSITION_WIDTH, getCaptionPreset } from '../presets';

const measure = (text: string) => text.length * 20;

const words: CaptionWord[] = [
  { text: 'one', start: 0.0, end: 0.4 },
  { text: 'two', start: 0.4, end: 0.9 },
  { text: 'three', start: 0.9, end: 1.3 },
];

function render(styleId: string) {
  const preset = getCaptionPreset(styleId);
  const pages = buildCaptionPages(words, preset);
  const frames = captionKeyframes(pages, { preset, measure, captionSize: 'medium' });
  return renderFramesToASS(frames)!;
}

describe('formatASSTime', () => {
  it('formats hours, minutes, seconds and centiseconds', () => {
    expect(formatASSTime(0)).toBe('0:00:00.00');
    expect(formatASSTime(1.5)).toBe('0:00:01.50');
    expect(formatASSTime(3725.25)).toBe('1:02:05.25');
  });

  it('clamps negatives to zero', () => {
    // A trim landing mid-word used to leave a negative start, which formatted
    // as "0:00:-1.-50" and made libass drop the line without a warning.
    expect(formatASSTime(-1.5)).toBe('0:00:00.00');
  });
});

describe('toASSColour', () => {
  it('converts hex to &HAABBGGRR with inverted alpha', () => {
    expect(toASSColour('#FFFFFF')).toBe('&H00FFFFFF');
    expect(toASSColour('#FFD700')).toBe('&H0000D7FF'); // gold: BGR order
    expect(toASSColour('#FF0000')).toBe('&H000000FF');
  });

  it('handles the rgba() colours the presets use for shadows', () => {
    // 0x19 = 25: ASS alpha runs backwards, so 90% opaque is 10% of 255.
    expect(toASSColour('rgba(0,0,0,0.9)')).toBe('&H19000000');
    expect(toASSColour('rgba(0,0,0,0)')).toBe('&HFF000000');
    expect(toASSColour('rgba(255,255,255,1)')).toBe('&H00FFFFFF');
  });
});

describe('renderFramesToASS', () => {
  it('declares both play resolutions so libass cannot infer a wrong width', () => {
    const ass = render('bold');
    // PlayResX missing made libass assume PlayResY * 4/3 = 2560, so every
    // horizontal metric was computed against a 2560-wide space on 1080 video.
    expect(ass).toContain(`PlayResX: ${COMPOSITION_WIDTH}`);
    expect(ass).toContain(`PlayResY: ${COMPOSITION_HEIGHT}`);
  });

  it('disables libass wrapping, because layout already broke the lines', () => {
    expect(render('bold')).toContain('WrapStyle: 2');
  });

  it('positions every word explicitly', () => {
    const dialogues = render('bold').split('\n').filter((l) => l.startsWith('Dialogue:'));
    expect(dialogues).toHaveLength(words.length * words.length);
    expect(dialogues.every((l) => /\{\\pos\(\d+,\d+\)\}/.test(l))).toBe(true);
  });

  it('marks exactly one word active per frame', () => {
    const dialogues = render('bold').split('\n').filter((l) => l.startsWith('Dialogue:'));
    const byTime = new Map<string, string[]>();
    for (const line of dialogues) {
      const key = line.split(',').slice(1, 3).join(',');
      byTime.set(key, [...(byTime.get(key) ?? []), line]);
    }
    for (const group of byTime.values()) {
      expect(group.filter((l) => l.includes(',Active,'))).toHaveLength(1);
    }
  });

  it('takes colours from the preset', () => {
    const preset = getCaptionPreset('minimal');
    const ass = render('minimal');
    // The old renderer hardcoded white and read the highlight from a snapshot
    // frozen on the clip, so minimal's grey and a re-picked preset both lost.
    expect(ass).toContain(`Style: Base,${'Inter'},`);
    expect(ass).toContain(toASSColour(preset.colors.text));
    expect(ass).toContain(toASSColour(preset.colors.activeText!));
  });

  it('underlines only the active style for an underline preset', () => {
    const lines = render('minimal').split('\n');
    const base = lines.find((l) => l.startsWith('Style: Base'))!.split(',');
    const active = lines.find((l) => l.startsWith('Style: Active'))!.split(',');
    expect(base[9]).toBe('0');
    expect(active[9]).toBe('-1');
  });

  it('scales Fontsize by the font metric libass sizes from', () => {
    const preset = getCaptionPreset('bold');
    const fontsize = Number(render('bold').split('\n').find((l) => l.startsWith('Style: Base'))!.split(',')[2]);
    // Anton's em is much smaller than its ascender-to-descender span, so
    // passing the em size straight through renders a third too small.
    expect(fontsize).toBe(Math.round(preset.typography.fontSize * 1.7334));
    expect(fontsize).toBeGreaterThan(preset.typography.fontSize);
  });

  it('uppercases in the file when the preset says to', () => {
    expect(render('bold')).toContain('ONE');
    expect(render('minimal')).toContain('one');
  });

  it('returns null when there is nothing to draw', () => {
    expect(renderFramesToASS([])).toBeNull();
  });
});
