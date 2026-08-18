/**
 * The raster renderer draws into a plate covering only the caption band rather
 * than the whole 1080x1920 frame. That is a pure optimisation, so the thing
 * worth testing is that it stays pure: the plate must contain everything the
 * full frame would have drawn, at the same place.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';
import { createCanvas, loadImage } from '@napi-rs/canvas';

import { createCaptionCanvas } from '../canvas.node';
import { createMeasurer, drawCaptionFrame } from '../draw';
import { buildFramesFromWords } from '../frames.node';
import type { CaptionWord } from '../layout';
import { renderCaptionOverlayTrack } from '../renderers/raster.node';
import {
  COMPOSITION_HEIGHT,
  COMPOSITION_WIDTH,
  getCaptionPreset,
  resolveFontSize,
} from '../presets';

const WORDS: CaptionWord[] = [
  { text: "you're", start: 0.0, end: 0.5 },
  { text: 'gonna', start: 0.5, end: 1.0 },
  { text: 'get', start: 1.0, end: 1.5 },
  { text: 'absolutely', start: 2.0, end: 2.5 },
  { text: 'extraordinary', start: 2.5, end: 3.0 },
  { text: 'results', start: 3.0, end: 3.5 },
];

const dirs: string[] = [];
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caption-raster-test-'));
  dirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

async function alphaRows(png: Buffer, width: number, height: number): Promise<boolean[]> {
  const image = await loadImage(png);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, width, height);

  const rows: boolean[] = [];
  for (let y = 0; y < height; y++) {
    let inked = false;
    for (let x = 0; x < width && !inked; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) inked = true;
    }
    rows.push(inked);
  }
  return rows;
}

describe.each(['classic', 'viral'])('raster overlay for %s', (styleId) => {
  const preset = getCaptionPreset(styleId);
  const frames = buildFramesFromWords(WORDS, { preset, captionSize: 'medium' });

  it('covers the whole clip with a continuous, correctly ordered playlist', async () => {
    const dir = tempDir();
    const track = (await renderCaptionOverlayTrack(frames, 5, dir))!;
    const playlist = fs.readFileSync(track.concatPath, 'utf-8');

    const durations = [...playlist.matchAll(/^duration (.+)$/gm)].map((m) => Number(m[1]));
    expect(durations.reduce((a, b) => a + b, 0)).toBeCloseTo(5, 2);

    // Every referenced image must exist, or ffmpeg fails mid-encode.
    for (const [, file] of playlist.matchAll(/^file '(.+)'$/gm)) {
      expect(fs.existsSync(path.join(dir, file))).toBe(true);
    }
    // The concat demuxer ignores the last duration unless the file repeats.
    expect(playlist.trimEnd().endsWith("'")).toBe(true);
  });

  it('rasterises one plate per keyframe, not per video frame', async () => {
    const track = (await renderCaptionOverlayTrack(frames, 5, tempDir()))!;
    expect(track.imageCount).toBe(frames.length);
  });

  it('crops to a band far smaller than the frame', async () => {
    const track = (await renderCaptionOverlayTrack(frames, 5, tempDir()))!;
    expect(track.bandHeight).toBeLessThan(0.35);
    expect(track.bandY + track.bandHeight).toBeLessThanOrEqual(1.000001);
    expect(track.bandY).toBeGreaterThanOrEqual(0);
  });

  it('loses no ink to the crop', async () => {
    const dir = tempDir();
    const track = (await renderCaptionOverlayTrack(frames, 5, dir))!;

    const bandY = Math.round(track.bandY * COMPOSITION_HEIGHT);
    const bandHeight = Math.round(track.bandHeight * COMPOSITION_HEIGHT);

    // What a full-frame render of the same moment would have drawn.
    const { canvas, ctx } = createCaptionCanvas();
    const fontSize = resolveFontSize(preset, 'medium');
    createMeasurer(ctx, preset, fontSize);
    drawCaptionFrame(ctx, frames[1]);
    const fullRows = await alphaRows(
      canvas.toBuffer('image/png'),
      COMPOSITION_WIDTH,
      COMPOSITION_HEIGHT
    );

    const inkedRows = fullRows.flatMap((inked, y) => (inked ? [y] : []));
    expect(inkedRows.length).toBeGreaterThan(0);
    expect(Math.min(...inkedRows)).toBeGreaterThanOrEqual(bandY);
    expect(Math.max(...inkedRows)).toBeLessThan(bandY + bandHeight);

    // And the plate holds that same ink, shifted into band coordinates.
    const plateRows = await alphaRows(
      fs.readFileSync(path.join(dir, 'frame-00001.png')),
      COMPOSITION_WIDTH,
      bandHeight
    );
    for (const y of inkedRows) {
      expect(plateRows[y - bandY]).toBe(true);
    }
  });

  it('draws nothing on the blank plate used for gaps', async () => {
    const dir = tempDir();
    await renderCaptionOverlayTrack(frames, 5, dir);
    const track = (await renderCaptionOverlayTrack(frames, 5, dir))!;
    const bandHeight = Math.round(track.bandHeight * COMPOSITION_HEIGHT);

    const rows = await alphaRows(
      fs.readFileSync(path.join(dir, 'blank.png')),
      COMPOSITION_WIDTH,
      bandHeight
    );
    expect(rows.some(Boolean)).toBe(false);
  });
});
