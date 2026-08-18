/**
 * Entry point the video pipeline calls to turn stored captions into something
 * ffmpeg can burn.
 *
 * Which renderer runs is a property of the preset, not of the call site, so the
 * processor asks for "captions for this clip" and gets back whatever the preset
 * needs — an ASS file for the cheap ones, an overlay track for the ones libass
 * cannot draw.
 */
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { buildCaptionFrames, type StoredCaptions } from './frames.node';
import { renderFramesToASS } from './renderers/ass';
import { renderCaptionOverlayTrack } from './renderers/raster.node';
import {
  getCaptionPreset,
  type CaptionPosition,
  type CaptionSize,
} from './presets';

export interface CaptionRenderRequest {
  captionStyle?: string | null;
  captionSize?: CaptionSize | null;
  captionPosition?: CaptionPosition | null;
}

/**
 * What the video pipeline has to feed ffmpeg to burn these captions.
 *
 * Exactly one of the two is set. The caller does not choose which — the preset
 * does — so adding a preset that needs the heavier path costs no change here or
 * in the processor.
 */
export interface PreparedCaptions {
  /** Subtitle file for the `ass` filter. */
  assPath?: string;
  /** ffconcat playlist for an RGBA overlay input. */
  overlayConcatPath?: string;
  /**
   * Where the overlay plate belongs, as fractions of composition height. The
   * plate covers only the caption band, so the filtergraph has to place it —
   * and it does so relative to the *output* height, which is not always the
   * composition's.
   */
  overlayBandY?: number;
  overlayBandHeight?: number;
  cleanup(): Promise<void>;
}

/**
 * Prepare captions for a burn, choosing the renderer from the preset.
 *
 * Returns null when there is nothing to draw, so the caller can leave the
 * filtergraph alone rather than attach an empty subtitle or overlay track.
 */
export async function prepareCaptions(
  captions: StoredCaptions,
  request: CaptionRenderRequest,
  opts: { duration: number; tempDir?: string }
): Promise<PreparedCaptions | null> {
  const preset = getCaptionPreset(request.captionStyle);
  const frames = buildCaptionFrames(captions, {
    preset,
    captionSize: request.captionSize,
    captionPosition: request.captionPosition,
  });
  if (frames.length === 0) return null;

  const tempDir = opts.tempDir ?? os.tmpdir();
  const stamp = `captions-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (preset.renderer === 'ass') {
    const content = renderFramesToASS(frames);
    if (!content) return null;

    const assPath = path.join(tempDir, `${stamp}.ass`);
    await fs.writeFile(assPath, content, 'utf-8');
    return {
      assPath,
      cleanup: async () => {
        await fs.unlink(assPath).catch(() => {});
      },
    };
  }

  const dir = path.join(tempDir, stamp);
  const track = await renderCaptionOverlayTrack(frames, opts.duration, dir);
  if (!track) return null;

  console.log(`  🎨 Rasterised ${track.imageCount} caption keyframes for ${preset.id}`);
  return {
    overlayConcatPath: track.concatPath,
    overlayBandY: track.bandY,
    overlayBandHeight: track.bandHeight,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

/**
 * Write an ASS subtitle file for these captions.
 *
 * Returns false when there is nothing to draw, so the caller can skip the filter
 * rather than attach an empty subtitle track.
 */
export async function writeCaptionAssFile(
  captions: StoredCaptions,
  request: CaptionRenderRequest,
  assPath: string
): Promise<boolean> {
  const preset = getCaptionPreset(request.captionStyle);
  const frames = buildCaptionFrames(captions, {
    preset,
    captionSize: request.captionSize,
    captionPosition: request.captionPosition,
  });

  const content = renderFramesToASS(frames);
  if (!content) return false;

  await fs.writeFile(assPath, content, 'utf-8');
  return true;
}
