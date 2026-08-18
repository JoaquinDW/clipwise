/**
 * Raster renderer — the path for presets libass cannot draw.
 *
 * A per-word background box with padding and a corner radius has no ASS
 * expression: `BorderStyle=3` is a style-level opaque box with square corners
 * that applies to a whole line, and there is no override tag for it. Rather than
 * quietly downgrade those presets to a colour swap — which is what the old
 * renderer did, and why the yellow box existed only in the preview — they are
 * drawn with the same Canvas2D code the editor uses and composited as an alpha
 * overlay.
 *
 * The cost is kept down by rasterising *keyframes* rather than video frames: a
 * caption only changes when the highlight moves, so a minute of speech is a few
 * hundred images instead of eighteen hundred.
 */
import { promises as fs } from 'fs';
import path from 'path';

import { createCaptionCanvas } from '../canvas.node';
import { drawCaptionFrame } from '../draw';
import type { CaptionFrame } from '../layout';
import { COMPOSITION_HEIGHT, COMPOSITION_WIDTH } from '../presets';

export interface CaptionOverlayTrack {
  /** ffconcat playlist, usable as an ffmpeg input with `-f concat -safe 0`. */
  concatPath: string;
  /** Directory holding the playlist and its images. */
  dir: string;
  /** Number of distinct images rasterised, for logging. */
  imageCount: number;
  /** Top edge of the plate, as a fraction of composition height. */
  bandY: number;
  /** Plate height, as a fraction of composition height. */
  bandHeight: number;
}

/** Two frames closer than this are the same moment as far as ffmpeg cares. */
const MIN_SEGMENT_SECONDS = 0.01;

/**
 * Captions occupy a band, not the frame. Rasterising the full 1080x1920 for a
 * ~250px-tall line meant encoding roughly eight times the pixels that could ever
 * be non-transparent — measurably the dominant cost of this renderer, on the
 * preset that happens to be the default.
 *
 * The band is derived from the laid-out words plus a margin for everything that
 * paints outside a glyph's box: stroke, shadow and the background plate.
 */
function captionBand(frames: CaptionFrame[]): { y: number; height: number } {
  const preset = frames[0].preset;
  const scale = frames[0].fontSize / preset.typography.fontSize;

  const margin =
    (preset.stroke?.width ?? 0) * 2 * scale +
    ((preset.shadow?.blur ?? 0) + Math.abs(preset.shadow?.offsetY ?? 0)) * scale +
    (preset.background?.paddingY ?? 0) * scale +
    // Slack for antialiasing and any descender the line box under-reports.
    frames[0].fontSize * 0.5;

  let top = Infinity;
  let bottom = -Infinity;
  for (const frame of frames) {
    for (const word of frame.words) {
      top = Math.min(top, word.y);
      bottom = Math.max(bottom, word.y + word.height);
    }
  }

  const y = Math.max(0, Math.floor(top - margin));
  const bottomEdge = Math.min(COMPOSITION_HEIGHT, Math.ceil(bottom + margin));
  // Even height: odd-sized planes upset yuv420p conversion downstream.
  const height = Math.max(2, Math.ceil((bottomEdge - y) / 2) * 2);

  return { y, height: Math.min(height, COMPOSITION_HEIGHT - y) };
}

/**
 * Rasterise caption keyframes into an overlay track covering `[0, duration]`.
 *
 * Gaps between pages are filled with one shared transparent image, so the track
 * stays continuous and time-aligned without a file per silent moment.
 *
 * Returns null when there is nothing to draw.
 */
export async function renderCaptionOverlayTrack(
  frames: CaptionFrame[],
  duration: number,
  dir: string
): Promise<CaptionOverlayTrack | null> {
  if (frames.length === 0 || duration <= 0) return null;

  await fs.mkdir(dir, { recursive: true });

  const band = captionBand(frames);
  const { canvas, ctx, raw } = createCaptionCanvas(COMPOSITION_WIDTH, band.height);
  // Draw in composition coordinates; the plate is just a window onto them, so
  // layout never has to know it is being cropped.
  raw.translate(0, -band.y);

  const blankName = 'blank.png';
  await fs.writeFile(path.join(dir, blankName), await canvas.encode('png'));

  // [filename, seconds] in playback order.
  const segments: Array<[string, number]> = [];
  let cursor = 0;
  let imageCount = 0;

  for (const frame of frames) {
    const start = Math.max(0, Math.min(frame.start, duration));
    const end = Math.max(0, Math.min(frame.end, duration));
    if (end - start < MIN_SEGMENT_SECONDS) continue;

    if (start - cursor >= MIN_SEGMENT_SECONDS) {
      segments.push([blankName, start - cursor]);
    }

    const name = `frame-${String(imageCount).padStart(5, '0')}.png`;
    ctx.clearRect(0, band.y, COMPOSITION_WIDTH, band.height);
    drawCaptionFrame(ctx, frame);
    await fs.writeFile(path.join(dir, name), await canvas.encode('png'));
    imageCount++;

    segments.push([name, end - start]);
    cursor = end;
  }

  if (segments.length === 0) return null;

  if (duration - cursor >= MIN_SEGMENT_SECONDS) {
    segments.push([blankName, duration - cursor]);
  }

  // The concat demuxer drops the final entry's duration unless the last file is
  // repeated, which would clip the closing caption.
  const lines = ['ffconcat version 1.0'];
  for (const [file, seconds] of segments) {
    lines.push(`file '${file}'`, `duration ${seconds.toFixed(3)}`);
  }
  lines.push(`file '${segments[segments.length - 1][0]}'`);

  const concatPath = path.join(dir, 'captions.ffconcat');
  await fs.writeFile(concatPath, lines.join('\n') + '\n', 'utf-8');

  return {
    concatPath,
    dir,
    imageCount,
    bandY: band.y / COMPOSITION_HEIGHT,
    bandHeight: band.height / COMPOSITION_HEIGHT,
  };
}
