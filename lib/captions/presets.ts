/**
 * Caption presets — the single source of truth for how a caption looks.
 *
 * There used to be two: `CAPTION_STYLES` drove the ASS burn and
 * `CAPTION_CSS_PRESETS` drove the browser preview. They shared five string keys
 * and nothing else, so they drifted: different font sizes in different units,
 * different vertical positions, and highlight modes that only one side could
 * express. Adding a preset meant writing it twice and hoping.
 *
 * Everything here is expressed in a virtual composition of
 * COMPOSITION_WIDTH x COMPOSITION_HEIGHT. The preview scales that composition
 * down to the player; the export renders it at the real output size. Neither
 * side holds a number the other does not.
 */

import type { CaptionFontKey } from './fonts';

/** The virtual canvas every preset number is expressed in. 9:16. */
export const COMPOSITION_WIDTH = 1080;
export const COMPOSITION_HEIGHT = 1920;

export type CaptionStyleName = 'classic' | 'bold' | 'minimal' | 'viral' | 'podcast';
export type CaptionPosition = 'top' | 'center' | 'bottom';
export type CaptionSize = 'small' | 'medium' | 'large';

/** How the active word is distinguished from the rest of the page. */
export type HighlightMode = 'none' | 'text-color' | 'background' | 'underline';

/**
 * Which pipeline can actually draw this preset.
 *
 * `ass` is nearly free — libass runs inside the crop encode that happens anyway.
 * `raster` costs an image pass, and is required for anything libass has no way
 * to express: per-word background boxes, corner radius, per-word transforms.
 */
export type CaptionRenderer = 'ass' | 'raster';

export interface CaptionPreset {
  id: CaptionStyleName;
  name: string;
  description: string;

  typography: {
    font: CaptionFontKey;
    /** Composition px. Multiplied by the user's size choice at render time. */
    fontSize: number;
    /** Multiple of fontSize. Also the height of a per-word background box. */
    lineHeight: number;
    /** Composition px added between glyphs. */
    letterSpacing: number;
    textTransform: 'none' | 'uppercase';
  };

  colors: {
    text: string;
    /** Colour of the active word's glyphs. Defaults to `text`. */
    activeText?: string;
    stroke?: string;
    shadow?: string;
    /** Fill behind the active word. Requires highlight mode `background`. */
    activeBackground?: string;
  };

  /** Outline drawn around every glyph. Composition px. */
  stroke?: { width: number };

  /** Drop shadow under every glyph. Composition px. */
  shadow?: { blur: number; offsetX: number; offsetY: number };

  layout: {
    /** Default vertical placement. `captionPosition` overrides it. */
    position: CaptionPosition;
    /** Fraction of composition width the text block may occupy before wrapping. */
    maxWidth: number;
    /** Words shown at once. The unit of grouping — see layout.ts. */
    wordsPerPage: number;
    textAlign: 'left' | 'center' | 'right';
  };

  /** Geometry of the active word's background box. Composition px. */
  background?: {
    paddingX: number;
    paddingY: number;
    borderRadius: number;
  };

  highlight: { mode: HighlightMode };

  renderer: CaptionRenderer;
}

/**
 * Preview sizes were CSS px on a player whose height varies with the viewport,
 * so there was never a "correct" number to carry over — only a ratio. These
 * presets reproduce the preview at a reference player height of 800px:
 * 1920 / 800 = 2.4 composition px per preview px. Every size, offset, spacing
 * and radius below is its old CSS value times that factor.
 */
const PREVIEW_TO_COMPOSITION = 2.4;

/** Converts an old preview-px value to composition px. Kept for calibration. */
export function fromPreviewPx(px: number): number {
  return Math.round(px * PREVIEW_TO_COMPOSITION);
}

export const CAPTION_PRESETS: Record<CaptionStyleName, CaptionPreset> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Clean white text with a gold box on the active word',
    typography: {
      font: 'inter-bold',
      fontSize: 43, // 18px preview
      lineHeight: 1.2,
      letterSpacing: 0,
      textTransform: 'none',
    },
    colors: {
      text: '#FFFFFF',
      activeText: '#000000',
      activeBackground: '#FFD700',
      shadow: 'rgba(0,0,0,0.9)',
    },
    shadow: { blur: 7, offsetX: 2, offsetY: 2 },
    layout: { position: 'bottom', maxWidth: 0.94, wordsPerPage: 3, textAlign: 'center' },
    background: { paddingX: 5, paddingY: 0, borderRadius: 5 },
    highlight: { mode: 'background' },
    renderer: 'raster',
  },

  bold: {
    id: 'bold',
    name: 'Bold',
    description: 'Heavy uppercase display type with red highlights',
    typography: {
      font: 'anton',
      fontSize: 53, // 22px preview
      lineHeight: 1.2,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    colors: {
      text: '#FFFFFF',
      activeText: '#FF0000',
      shadow: '#000000',
    },
    // The CSS was `2px 2px 0px #000` — a hard offset, no blur.
    shadow: { blur: 0, offsetX: 5, offsetY: 5 },
    layout: { position: 'center', maxWidth: 0.94, wordsPerPage: 3, textAlign: 'center' },
    highlight: { mode: 'text-color' },
    renderer: 'ass',
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Subtle light grey text, active word underlined in blue',
    typography: {
      font: 'inter',
      fontSize: 38, // 16px preview
      lineHeight: 1.2,
      letterSpacing: 1,
      textTransform: 'none',
    },
    colors: {
      text: '#E8E8E8',
      activeText: '#00A8FF',
      shadow: 'rgba(0,0,0,0.7)',
    },
    shadow: { blur: 5, offsetX: 2, offsetY: 2 },
    layout: { position: 'bottom', maxWidth: 0.94, wordsPerPage: 3, textAlign: 'center' },
    highlight: { mode: 'underline' },
    renderer: 'ass',
  },

  viral: {
    id: 'viral',
    name: 'Viral',
    description: 'TikTok-native black-stroked type with an orange box',
    typography: {
      font: 'archivo-black',
      fontSize: 48, // 20px preview
      lineHeight: 1.2,
      letterSpacing: 1,
      textTransform: 'none',
    },
    colors: {
      text: '#FFFFFF',
      activeText: '#000000',
      activeBackground: '#FF6B00',
      stroke: '#000000',
    },
    // The CSS stacked two hard shadows in opposite directions to fake an
    // outline. A real stroke is what it was reaching for.
    stroke: { width: 5 },
    layout: { position: 'center', maxWidth: 0.94, wordsPerPage: 3, textAlign: 'center' },
    background: { paddingX: 5, paddingY: 0, borderRadius: 5 },
    highlight: { mode: 'background' },
    renderer: 'raster',
  },

  podcast: {
    id: 'podcast',
    name: 'Podcast',
    description: 'Centred serif for interview and podcast clips',
    typography: {
      font: 'source-serif',
      fontSize: 41, // 17px preview
      lineHeight: 1.2,
      letterSpacing: 1,
      textTransform: 'none',
    },
    colors: {
      text: '#F0F0F0',
      activeText: '#FFFFFF',
      shadow: 'rgba(0,0,0,0.8)',
    },
    shadow: { blur: 7, offsetX: 2, offsetY: 2 },
    layout: { position: 'center', maxWidth: 0.94, wordsPerPage: 3, textAlign: 'center' },
    highlight: { mode: 'text-color' },
    renderer: 'ass',
  },
};

/** The user's S/M/L choice, applied on top of a preset's fontSize. */
export const SIZE_MULTIPLIERS: Record<CaptionSize, number> = {
  small: 0.75,
  medium: 1.0,
  large: 1.3,
};

/**
 * Where a caption block sits, as a fraction of composition height, plus which
 * edge of the block that fraction refers to.
 *
 * Taken from the preview's CSS, which is the visual reference: `bottom: 15%`
 * anchored the block's bottom edge at 0.85, `top: 8%` its top edge at 0.08, and
 * centre used a translate. The old ASS margin table (480/1920 = 25% for bottom)
 * disagreed with all of it and is gone.
 */
export const POSITION_ANCHORS: Record<
  CaptionPosition,
  { y: number; anchor: 'top' | 'middle' | 'bottom' }
> = {
  top: { y: 0.08, anchor: 'top' },
  center: { y: 0.5, anchor: 'middle' },
  bottom: { y: 0.85, anchor: 'bottom' },
};

// ── Resolution & compatibility ───────────────────────────────────────────────

/** Names from before V1.5. Clips in the database still carry them. */
const LEGACY_STYLE_MAP: Record<string, CaptionStyleName> = {
  basic: 'classic',
  dynamic: 'bold',
};

const ALL_STYLE_KEYS = new Set<string>(Object.keys(CAPTION_PRESETS));

/** Resolve a stored style name, handling legacy aliases and unknown values. */
export function resolveStyleName(styleName?: string | null): CaptionStyleName {
  if (!styleName) return 'classic';
  if (styleName in LEGACY_STYLE_MAP) return LEGACY_STYLE_MAP[styleName];
  if (ALL_STYLE_KEYS.has(styleName)) return styleName as CaptionStyleName;
  return 'classic';
}

export function getCaptionPreset(styleName?: string | null): CaptionPreset {
  return CAPTION_PRESETS[resolveStyleName(styleName)];
}

export function getAllCaptionPresets(): CaptionPreset[] {
  return Object.values(CAPTION_PRESETS);
}

/** Used by API routes to reject unknown values. */
export function isValidCaptionStyleName(name: string): boolean {
  return ALL_STYLE_KEYS.has(name) || name in LEGACY_STYLE_MAP;
}

/** Font size in composition px for a preset at a given user size. */
export function resolveFontSize(preset: CaptionPreset, size?: CaptionSize | null): number {
  return Math.round(preset.typography.fontSize * SIZE_MULTIPLIERS[size ?? 'medium']);
}

/** Which pipeline renders this preset. */
export function getRendererForPreset(preset: CaptionPreset): CaptionRenderer {
  return preset.renderer;
}

/**
 * Bumped whenever a change here alters the pixels a render produces.
 *
 * `settingsMatch` reuses an already-rendered clip when the style, position, size
 * and trim all match. Without this in the key, someone who exported "classic /
 * bottom / medium" before a preset change would keep being handed the old file
 * forever.
 */
export const CAPTION_RENDER_VERSION = 2;
