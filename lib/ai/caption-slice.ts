/**
 * Re-time a clip's stored captions onto a trimmed range.
 *
 * What gets burned into a downloaded clip has to be what the editor showed, and
 * the editor draws `clip.captions` straight from the database. Asking the model
 * for captions again would produce a different grouping — generateCaptions runs
 * an LLM, and the style preset is part of its prompt — so an edit reuses the
 * stored captions and only moves them.
 *
 * This mirrors the preview exactly: dragging a trim handle does not regenerate
 * anything either, it just plays a different window of the same captions.
 */

import type { CaptionsResult, CaptionSegment } from './captions';

/**
 * Shift captions by `offsetSeconds` and keep only what still falls inside
 * `[0, duration]`. Times are clip-relative on both sides.
 *
 * A segment survives if any part of it overlaps the new range; its words move
 * with it. Segments are clipped rather than dropped at the boundary so a cut
 * mid-sentence still shows the words that are actually audible.
 */
export function sliceCaptions(
  captions: CaptionsResult,
  offsetSeconds: number,
  duration: number
): CaptionsResult {
  const shifted: CaptionSegment[] = [];

  for (const segment of captions.captions) {
    const startTime = segment.startTime - offsetSeconds;
    const endTime = segment.endTime - offsetSeconds;

    // Fully outside the new range
    if (endTime <= 0 || startTime >= duration) continue;

    // Word bounds are clamped, not just segment bounds. A cut landing mid-word
    // leaves that word with a negative start, and a negative timestamp makes the
    // renderer emit a malformed cue that gets dropped without a warning.
    const words = segment.words
      .map((word) => ({
        ...word,
        startTime: word.startTime - offsetSeconds,
        endTime: word.endTime - offsetSeconds,
      }))
      .filter((word) => word.endTime > 0 && word.startTime < duration)
      .map((word) => ({
        ...word,
        startTime: Math.max(0, word.startTime),
        endTime: Math.min(duration, word.endTime),
      }));

    // A segment whose every word fell outside would render as a blank caption
    if (words.length === 0) continue;

    shifted.push({
      ...segment,
      startTime: Math.max(0, startTime),
      endTime: Math.min(duration, endTime),
      words,
    });
  }

  return { ...captions, captions: shifted };
}
