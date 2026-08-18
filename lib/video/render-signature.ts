/**
 * What settings was a clip's stored file actually rendered with?
 *
 * /api/clips/[id]/reexport uses this to recognise a render it already produced
 * and hand it straight back, so downloading the same thing twice costs one
 * request instead of a second ffmpeg pass.
 */

import type { ClipMetadata } from '@/lib/types/clip-metadata';

/** Defaults the editor falls back to when a clip carries no caption settings. */
export const DEFAULT_CAPTION_STYLE = 'classic';
export const DEFAULT_CAPTION_POSITION: CaptionPosition = 'bottom';
export const DEFAULT_CAPTION_SIZE: CaptionSize = 'medium';

export type CaptionPosition = 'top' | 'center' | 'bottom';
export type CaptionSize = 'small' | 'medium' | 'large';

/** Everything that changes the bytes ffmpeg produces. */
export interface RenderSettings {
  startTime: number;
  endTime: number;
  captionStyle: string;
  captionPosition: CaptionPosition;
  captionSize: CaptionSize;
  /**
   * Which generation of the caption renderer produced the file. The settings
   * above describe what the user asked for; this describes what we did with it.
   * A clip burned before a preset change matches on all five and would be handed
   * back forever without it.
   */
  captionRenderVersion: number;
}

export interface ClipLike {
  startTime: number;
  endTime: number;
  metadata?: unknown;
}

export interface CaptionEdits {
  deltaStart: number;
  deltaEnd: number;
  captionStyle: string;
  captionPosition: CaptionPosition;
  captionSize: CaptionSize;
}

/** Trim deltas are rounded to 0.1s, so anything tighter is float noise. */
const TIME_EPSILON = 0.05;

/**
 * The settings a clip's stored file was actually rendered with, or null when
 * the file has no burned captions — which is every AI-generated clip, since
 * clip.worker.ts only burns on `metadata.burnCaptions === true`.
 */
export function renderedSettings(clip: ClipLike): RenderSettings | null {
  const meta = (clip.metadata ?? null) as ClipMetadata | null;
  if (meta?.burnCaptions !== true) return null;

  return {
    startTime: clip.startTime,
    endTime: clip.endTime,
    captionStyle: meta.captionStyle ?? DEFAULT_CAPTION_STYLE,
    captionPosition: meta.captionPosition ?? DEFAULT_CAPTION_POSITION,
    captionSize: meta.captionSize ?? DEFAULT_CAPTION_SIZE,
    // Absent on anything burned before versioning existed, which is exactly the
    // set of clips that must not be served from cache.
    captionRenderVersion: meta.captionRenderVersion ?? 0,
  };
}

export function settingsMatch(
  a: RenderSettings | null,
  b: RenderSettings | null
): boolean {
  if (!a || !b) return false;

  return (
    Math.abs(a.startTime - b.startTime) < TIME_EPSILON &&
    Math.abs(a.endTime - b.endTime) < TIME_EPSILON &&
    a.captionStyle === b.captionStyle &&
    a.captionPosition === b.captionPosition &&
    a.captionSize === b.captionSize &&
    a.captionRenderVersion === b.captionRenderVersion
  );
}
