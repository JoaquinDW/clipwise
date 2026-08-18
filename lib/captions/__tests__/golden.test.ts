/**
 * Visual regression for the shared renderer.
 *
 * Because the export path draws with the same `drawCaptionFrame` the editor
 * uses, rendering goldens needs no browser and no screenshot service — the
 * export renderer is its own harness. A change that moves a caption, resizes it
 * or recolours it fails here rather than in a downloaded clip.
 *
 * Regenerate deliberately, after eyeballing the result:
 *   UPDATE_CAPTION_GOLDENS=1 npx vitest run lib/captions/__tests__/golden.test.ts
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { createCanvas, loadImage } from '@napi-rs/canvas';

import { createCaptionCanvas } from '../canvas.node';
import { createMeasurer, drawCaptionFrame, measureAscentRatio } from '../draw';
import { buildCaptionPages, captionFrameAt, type CaptionWord } from '../layout';
import {
  COMPOSITION_HEIGHT,
  COMPOSITION_WIDTH,
  getAllCaptionPresets,
  resolveFontSize,
} from '../presets';

const GOLDEN_DIR = path.join(__dirname, '__goldens__');
const UPDATE = process.env.UPDATE_CAPTION_GOLDENS === '1';

/** A fixture with a gap, a long word that forces wrapping, and an apostrophe. */
const WORDS: CaptionWord[] = [
  { text: "you're", start: 0.0, end: 0.5 },
  { text: 'gonna', start: 0.5, end: 1.0 },
  { text: 'get', start: 1.0, end: 1.5 },
  { text: 'absolutely', start: 2.0, end: 2.5 },
  { text: 'extraordinary', start: 2.5, end: 3.0 },
  { text: 'results', start: 3.0, end: 3.5 },
];

const SAMPLE_TIMES = [0.0, 0.5, 1.0, 1.5, 2.0];

/** Fraction of pixels allowed to differ, to absorb rasteriser jitter. */
const MAX_DIFF_RATIO = 0.002;
/** Per-channel difference below which two pixels count as equal. */
const CHANNEL_TOLERANCE = 12;

function renderFrame(styleId: string, t: number): Buffer {
  const preset = getAllCaptionPresets().find((p) => p.id === styleId)!;
  const { canvas, ctx } = createCaptionCanvas();
  const fontSize = resolveFontSize(preset, 'medium');
  const pages = buildCaptionPages(WORDS, preset);

  const frame = captionFrameAt(pages, t, {
    preset,
    captionSize: 'medium',
    measure: createMeasurer(ctx, preset, fontSize),
    ascentRatio: measureAscentRatio(ctx, preset, fontSize),
  });
  if (frame) drawCaptionFrame(ctx, frame);

  return canvas.toBuffer('image/png');
}

async function pixels(png: Buffer): Promise<Uint8ClampedArray> {
  const image = await loadImage(png);
  const canvas = createCanvas(COMPOSITION_WIDTH, COMPOSITION_HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, COMPOSITION_WIDTH, COMPOSITION_HEIGHT).data;
}

/** Pixels with any alpha at all — i.e. anything the renderer actually drew. */
function countOpaque(data: Uint8ClampedArray): number {
  let count = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) count++;
  }
  return count;
}

async function differingRatio(a: Buffer, b: Buffer): Promise<number> {
  const [pa, pb] = await Promise.all([pixels(a), pixels(b)]);
  let differing = 0;
  for (let i = 0; i < pa.length; i += 4) {
    for (let c = 0; c < 4; c++) {
      if (Math.abs(pa[i + c] - pb[i + c]) > CHANNEL_TOLERANCE) {
        differing++;
        break;
      }
    }
  }
  return differing / (pa.length / 4);
}

describe('caption goldens', () => {
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });

  for (const preset of getAllCaptionPresets()) {
    for (const t of SAMPLE_TIMES) {
      const name = `${preset.id}-t${t.toFixed(1)}.png`;

      it(`${preset.id} at ${t.toFixed(1)}s matches its golden`, async () => {
        const actual = renderFrame(preset.id, t);
        const goldenPath = path.join(GOLDEN_DIR, name);

        if (UPDATE || !fs.existsSync(goldenPath)) {
          fs.writeFileSync(goldenPath, actual);
          expect(fs.existsSync(goldenPath)).toBe(true);
          return;
        }

        const ratio = await differingRatio(actual, fs.readFileSync(goldenPath));
        if (ratio > MAX_DIFF_RATIO) {
          fs.writeFileSync(path.join(GOLDEN_DIR, `${name}.actual`), actual);
        }
        expect(ratio).toBeLessThanOrEqual(MAX_DIFF_RATIO);
      });
    }
  }

  it('draws the active word on a background box for box presets', async () => {
    // The requirement that started this work: the per-word yellow box has to
    // survive into the export, not just the preview.
    const withBox = await pixels(renderFrame('classic', 0.6));
    let gold = 0;
    for (let i = 0; i < withBox.length; i += 4) {
      if (withBox[i] > 200 && withBox[i + 1] > 170 && withBox[i + 2] < 80 && withBox[i + 3] > 200) {
        gold++;
      }
    }
    expect(gold).toBeGreaterThan(500);
  });

  it('holds the last page across the pause before the next one', async () => {
    // 1.9s sits between pages, but only 0.5s after the first ended — inside the
    // hold, so the caption stays up rather than blinking off.
    const held = await pixels(renderFrame('classic', 1.9));
    expect(countOpaque(held)).toBeGreaterThan(0);
  });

  it('renders nothing once the final page has expired', async () => {
    // Last word ends at 3.5, hold is capped at 1.2s.
    const empty = await pixels(renderFrame('classic', 5.0));
    expect(countOpaque(empty)).toBe(0);
  });
});
