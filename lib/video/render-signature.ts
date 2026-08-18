/**
 * Does the file on disk already match what the editor is showing?
 *
 * The preview draws captions as a live HTML overlay and applies trim as pure
 * client state, so a clip's stored MP4 and its on-screen appearance can differ.
 * Download has to close that gap: it renders only when the answer here is no.
 *
 * Shared by the client (to decide whether to render before saving) and by
 * /api/clips/[id]/reexport (to hand back an existing render instead of
 * queueing a duplicate), so both sides agree on what "already rendered" means.
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
  };
}

/** The settings the editor is currently showing, in source-video seconds. */
export function desiredSettings(clip: ClipLike, edits: CaptionEdits): RenderSettings {
  return {
    startTime: clip.startTime + edits.deltaStart,
    endTime: clip.endTime + edits.deltaEnd,
    captionStyle: edits.captionStyle,
    captionPosition: edits.captionPosition,
    captionSize: edits.captionSize,
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
    a.captionSize === b.captionSize
  );
}

/** Whether Download has to render before it can hand over a file. */
export function needsRender(clip: ClipLike, edits: CaptionEdits): boolean {
  return !settingsMatch(renderedSettings(clip), desiredSettings(clip, edits));
}
