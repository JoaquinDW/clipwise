/**
 * Caption layout engine — decides *what* is on screen and *where*, once.
 *
 * Preview and export used to answer these questions separately: the browser
 * picked a segment and let CSS wrap it, libass picked word spans and wrapped
 * them again at a different width. Same input, two different answers.
 *
 * This module answers them for both. It is pure and isomorphic; the only thing
 * it needs from its environment is the ability to measure a string, which
 * Canvas2D provides identically in the browser and in Skia.
 *
 * Coordinates are composition px (see COMPOSITION_WIDTH/HEIGHT). The renderers
 * below this layer only draw.
 */

import {
  COMPOSITION_HEIGHT,
  COMPOSITION_WIDTH,
  POSITION_ANCHORS,
  resolveFontSize,
  type CaptionPosition,
  type CaptionPreset,
  type CaptionSize,
} from './presets';

/** A word with clip-relative timing. The atom everything else is built from. */
export interface CaptionWord {
  text: string;
  start: number;
  end: number;
}

/** A group of words shown together. The unit of grouping. */
export interface CaptionPage {
  words: CaptionWord[];
  start: number;
  end: number;
}

export interface LaidOutWord {
  text: string;
  /** Top-left of the word's line box, composition px. */
  x: number;
  y: number;
  width: number;
  /** Full line-box height — also the height of a background box. */
  height: number;
  /** Baseline offset from `y`, for renderers that draw from a baseline. */
  baseline: number;
  active: boolean;
}

/** Everything a renderer needs to draw one moment of a caption. */
export interface CaptionFrame {
  words: LaidOutWord[];
  /** Window this exact frame is valid for. */
  start: number;
  end: number;
  fontSize: number;
  preset: CaptionPreset;
}

/** Measures a run of text at the size and font already set on the context. */
export type TextMeasurer = (text: string) => number;

export interface LayoutContext {
  preset: CaptionPreset;
  captionSize?: CaptionSize | null;
  captionPosition?: CaptionPosition | null;
  measure: TextMeasurer;
  /** Ascent as a fraction of font size, for baseline placement. */
  ascentRatio?: number;
  width?: number;
  height?: number;
}

/**
 * How long a page stays up after its last word ends.
 *
 * Whisper leaves gaps between words and between phrases. Keying visibility to
 * word spans alone — which is what the ASS generator did — blinks the caption
 * off in every one of them. Holding to the next page removes the flicker;
 * the cap stops a caption hanging over a long silence.
 */
const MAX_PAGE_HOLD_SECONDS = 1.2;

/** Typical ascent for the caption faces, as a fraction of em. */
const DEFAULT_ASCENT_RATIO = 0.8;

/**
 * Flatten stored captions to a word list.
 *
 * The segment boundaries the model produced are deliberately dropped: they were
 * an LLM's opinion, recorded once at generation time, and a preset that wants
 * four words per page cannot honour a two-word segment. Grouping belongs to the
 * preset, so it is recomputed here — deterministically, from timings only.
 */
export function flattenCaptionWords(captions: {
  captions: Array<{ words: Array<{ word: string; startTime: number; endTime: number }> }>;
}): CaptionWord[] {
  return captions.captions
    .flatMap((segment) => segment.words)
    .map((word) => ({ text: word.word, start: word.startTime, end: word.endTime }))
    .filter((word) => word.text.trim().length > 0)
    .sort((a, b) => a.start - b.start);
}

/** Chunk words into pages of `preset.layout.wordsPerPage`. */
export function buildCaptionPages(words: CaptionWord[], preset: CaptionPreset): CaptionPage[] {
  const perPage = Math.max(1, preset.layout.wordsPerPage);
  const pages: CaptionPage[] = [];

  for (let i = 0; i < words.length; i += perPage) {
    const group = words.slice(i, i + perPage);
    pages.push({
      words: group,
      start: group[0].start,
      end: group[group.length - 1].end,
    });
  }

  return pages;
}

/** The window a page occupies on screen, including its hold. */
export function pageWindow(pages: CaptionPage[], index: number): { start: number; end: number } {
  const page = pages[index];
  const next = pages[index + 1];
  const hold = Math.min(
    MAX_PAGE_HOLD_SECONDS,
    next ? Math.max(0, next.start - page.end) : MAX_PAGE_HOLD_SECONDS
  );
  return { start: page.start, end: page.end + hold };
}

/** Left edge of a line, given how the block is aligned within its max width. */
function lineStart(
  align: CaptionPreset['layout']['textAlign'],
  lineWidth: number,
  compWidth: number,
  maxWidth: number
): number {
  const gutter = (compWidth - maxWidth) / 2;
  if (align === 'center') return (compWidth - lineWidth) / 2;
  if (align === 'right') return compWidth - gutter - lineWidth;
  return gutter;
}

function applyTransform(text: string, preset: CaptionPreset): string {
  return preset.typography.textTransform === 'uppercase' ? text.toUpperCase() : text;
}

/**
 * The active word: the one containing `t`, else the last one that has started.
 *
 * The fallback is what keeps a highlight from dropping out during the pause
 * between two words — the preview's `findIndex` returned -1 there and rendered
 * an unhighlighted page for a frame or two.
 */
export function activeWordIndex(page: CaptionPage, t: number): number {
  let index = -1;
  for (let i = 0; i < page.words.length; i++) {
    if (t >= page.words[i].start) index = i;
  }
  return index;
}

/**
 * Position one page's words. Geometry only — independent of which word is live,
 * so the active word can change without anything moving.
 */
export function layoutPage(page: CaptionPage, ctx: LayoutContext): LaidOutWord[] {
  const { preset, measure } = ctx;
  const compWidth = ctx.width ?? COMPOSITION_WIDTH;
  const compHeight = ctx.height ?? COMPOSITION_HEIGHT;

  const fontSize = resolveFontSize(preset, ctx.captionSize);
  const lineHeight = fontSize * preset.typography.lineHeight;
  const maxWidth = compWidth * preset.layout.maxWidth;
  const spaceWidth = measure(' ');

  // Greedy wrap. Words are measured with the transform already applied, since
  // uppercasing changes advance widths.
  const texts = page.words.map((word) => applyTransform(word.text, preset));
  const widths = texts.map(measure);

  const lines: Array<{ indices: number[]; width: number }> = [];
  let current: number[] = [];
  let currentWidth = 0;

  for (let i = 0; i < texts.length; i++) {
    const additional = current.length === 0 ? widths[i] : spaceWidth + widths[i];
    if (current.length > 0 && currentWidth + additional > maxWidth) {
      lines.push({ indices: current, width: currentWidth });
      current = [i];
      currentWidth = widths[i];
    } else {
      current.push(i);
      currentWidth += additional;
    }
  }
  if (current.length > 0) lines.push({ indices: current, width: currentWidth });

  const blockHeight = lines.length * lineHeight;
  const { y, anchor } = POSITION_ANCHORS[ctx.captionPosition ?? preset.layout.position];
  const anchorY = y * compHeight;
  const blockTop =
    anchor === 'top' ? anchorY : anchor === 'middle' ? anchorY - blockHeight / 2 : anchorY - blockHeight;

  const baseline = lineHeight / 2 + ((ctx.ascentRatio ?? DEFAULT_ASCENT_RATIO) - 0.5) * fontSize;
  const out: LaidOutWord[] = [];

  lines.forEach((line, lineIndex) => {
    const lineTop = blockTop + lineIndex * lineHeight;
    let cursor = lineStart(preset.layout.textAlign, line.width, compWidth, maxWidth);

    line.indices.forEach((wordIndex, positionInLine) => {
      if (positionInLine > 0) cursor += spaceWidth;
      out.push({
        text: texts[wordIndex],
        x: cursor,
        y: lineTop,
        width: widths[wordIndex],
        height: lineHeight,
        baseline,
        active: false,
      });
      cursor += widths[wordIndex];
    });
  });

  return out;
}

/**
 * The frame visible at `t`, or null when no caption is on screen.
 *
 * This is what the preview calls every animation frame, and what the export
 * calls at each keyframe — the single answer to "what does the viewer see now".
 */
export function captionFrameAt(
  pages: CaptionPage[],
  t: number,
  ctx: LayoutContext
): CaptionFrame | null {
  const index = pages.findIndex((_, i) => {
    const window = pageWindow(pages, i);
    return t >= window.start && t < window.end;
  });
  if (index === -1) return null;

  const page = pages[index];
  const window = pageWindow(pages, index);
  const words = layoutPage(page, ctx);
  const active = activeWordIndex(page, t);

  // layoutPage returns words in reading order, which is page order.
  words.forEach((word, i) => {
    word.active = i === active;
  });

  return {
    words,
    start: window.start,
    end: window.end,
    fontSize: resolveFontSize(ctx.preset, ctx.captionSize),
    preset: ctx.preset,
  };
}

/**
 * Every distinct frame in a clip, with the window each one holds for.
 *
 * A caption only changes when the active word changes, so this is the complete
 * set an exporter has to draw — a few hundred for a minute of speech, not one
 * per video frame.
 */
export function captionKeyframes(pages: CaptionPage[], ctx: LayoutContext): CaptionFrame[] {
  const frames: CaptionFrame[] = [];
  const fontSize = resolveFontSize(ctx.preset, ctx.captionSize);

  pages.forEach((page, pageIndex) => {
    const window = pageWindow(pages, pageIndex);
    const positioned = layoutPage(page, ctx);

    page.words.forEach((word, wordIndex) => {
      const isLast = wordIndex === page.words.length - 1;
      const start = wordIndex === 0 ? window.start : word.start;
      const end = isLast ? window.end : page.words[wordIndex + 1].start;
      if (end <= start) return;

      frames.push({
        words: positioned.map((laidOut, i) => ({ ...laidOut, active: i === wordIndex })),
        start,
        end,
        fontSize,
        preset: ctx.preset,
      });
    });
  });

  return frames;
}
