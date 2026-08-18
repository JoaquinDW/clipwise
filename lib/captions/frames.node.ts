/**
 * Turns stored captions into laid-out frames, using Skia to measure.
 *
 * Both export renderers start here, so both are looking at the same geometry the
 * preview computed — the layout engine is shared, and this only supplies it with
 * a measuring context.
 */
import { createCaptionCanvas } from './canvas.node';
import { createMeasurer, measureAscentRatio } from './draw';
import {
  buildCaptionPages,
  captionKeyframes,
  flattenCaptionWords,
  type CaptionFrame,
  type CaptionWord,
} from './layout';
import {
  resolveFontSize,
  type CaptionPosition,
  type CaptionPreset,
  type CaptionSize,
} from './presets';

export interface FrameBuildOptions {
  preset: CaptionPreset;
  captionSize?: CaptionSize | null;
  captionPosition?: CaptionPosition | null;
}

/** Stored caption JSON, structurally. */
export interface StoredCaptions {
  captions: Array<{ words: Array<{ word: string; startTime: number; endTime: number }> }>;
}

/**
 * Every frame a clip needs, in order.
 *
 * One frame per active word rather than one per video frame: a caption only
 * changes when the highlight moves, so a minute of speech is a few hundred
 * frames, not eighteen hundred.
 */
export function buildCaptionFrames(
  captions: StoredCaptions,
  opts: FrameBuildOptions
): CaptionFrame[] {
  return buildFramesFromWords(flattenCaptionWords(captions), opts);
}

export function buildFramesFromWords(
  words: CaptionWord[],
  { preset, captionSize, captionPosition }: FrameBuildOptions
): CaptionFrame[] {
  if (words.length === 0) return [];

  const { ctx } = createCaptionCanvas(1, 1);
  const fontSize = resolveFontSize(preset, captionSize);

  return captionKeyframes(buildCaptionPages(words, preset), {
    preset,
    captionSize,
    captionPosition,
    measure: createMeasurer(ctx, preset, fontSize),
    ascentRatio: measureAscentRatio(ctx, preset, fontSize),
  });
}
