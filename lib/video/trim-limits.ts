/**
 * Single source of truth for how far a user may trim a clip.
 *
 * These bounds are enforced in three places that must agree: the timeline
 * handles (which clamp while dragging), the editor's re-export gate, and the
 * server-side validation in /api/clips/[id]/reexport.
 */

/** How far either edge may move from the clip the AI produced. */
export const MAX_DELTA = 15;
/** A clip shorter than this is not worth publishing. */
export const MIN_DURATION = 10;
/** Longer than this stops being short-form. */
export const MAX_DURATION = 90;

export type TrimHandle = 'start' | 'end';

export interface TrimBounds {
  /** Original clip boundaries, in source-video seconds. */
  startTime: number;
  endTime: number;
}

export interface TrimDeltas {
  deltaStart: number;
  deltaEnd: number;
}

/**
 * Legal range for one handle, expressed in source-video seconds, given where
 * the *other* handle currently sits. Used both to clamp a drag and to render
 * how far a handle is allowed to travel.
 */
export function handleTimeRange(
  clip: TrimBounds,
  deltas: TrimDeltas,
  handle: TrimHandle
): { min: number; max: number } {
  if (handle === 'start') {
    const end = clip.endTime + deltas.deltaEnd;
    return {
      min: Math.max(clip.startTime - MAX_DELTA, 0, end - MAX_DURATION),
      max: Math.min(clip.startTime + MAX_DELTA, end - MIN_DURATION),
    };
  }

  const start = clip.startTime + deltas.deltaStart;
  return {
    min: Math.max(clip.endTime - MAX_DELTA, start + MIN_DURATION),
    max: Math.min(clip.endTime + MAX_DELTA, start + MAX_DURATION),
  };
}

/**
 * Clamp a proposed absolute time for one handle into its legal range and return
 * it as a delta. Unlike the old +/-2s buttons — which discarded an
 * out-of-bounds press entirely — a drag past the limit stops at the limit.
 */
export function clampTrim(
  clip: TrimBounds,
  deltas: TrimDeltas,
  handle: TrimHandle,
  proposedTime: number
): number {
  const { min, max } = handleTimeRange(clip, deltas, handle);
  const clamped = Math.min(Math.max(proposedTime, min), max);
  const origin = handle === 'start' ? clip.startTime : clip.endTime;
  // Round to 0.1s so the readout and the payload never carry float noise.
  return Math.round((clamped - origin) * 10) / 10;
}

/** Whether a pair of deltas describes a clip the server will accept. */
export function isTrimValid(clip: TrimBounds, deltas: TrimDeltas): boolean {
  const start = clip.startTime + deltas.deltaStart;
  const end = clip.endTime + deltas.deltaEnd;
  const duration = end - start;

  return (
    Math.abs(deltas.deltaStart) <= MAX_DELTA &&
    Math.abs(deltas.deltaEnd) <= MAX_DELTA &&
    duration >= MIN_DURATION &&
    duration <= MAX_DURATION &&
    start >= 0
  );
}
