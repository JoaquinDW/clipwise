/* eslint-disable indent */
/**
 * Compatibility adapter over `lib/captions/presets.ts`.
 *
 * This file used to hold two hand-maintained preset tables — `CAPTION_STYLES`
 * for the ASS burn and `CAPTION_CSS_PRESETS` for the browser preview — which is
 * exactly how preview and export came to disagree. Both are now *derived* from
 * the one definition in `lib/captions/presets.ts`, so they can no longer drift.
 *
 * Everything here is transitional and shrinks as callers move to the new module:
 * `getCaptionCSSStyle` dies with the DOM overlay, `getCaptionStyle` with the
 * rewritten ASS renderer.
 */
import {
  COMPOSITION_HEIGHT,
  POSITION_ANCHORS,
  getAllCaptionPresets,
  resolveStyleName,
  type CaptionPreset,
  type CaptionPosition,
  type CaptionStyleName,
} from '../captions/presets';
import { getCaptionFont } from '../captions/fonts';

export type { CaptionStyleName };
export { resolveStyleName, isValidCaptionStyleName } from '../captions/presets';

export interface CaptionStylePreset {
  name: string;
  description: string;
  fontSize: number;
  color: string;
  highlightColor: string;
  font: string;
  fontWeight: 'normal' | 'bold';
  position: CaptionPosition;
  marginV: number; // Vertical margin in composition px for ASS format
}

/**
 * Vertical margin an ASS alignment needs to land the block where the preset
 * says. Alignment 5 (middle) ignores MarginV entirely, hence the 0.
 */
function marginVFor(position: CaptionPosition): number {
  const { y, anchor } = POSITION_ANCHORS[position];
  if (anchor === 'middle') return 0;
  return Math.round((anchor === 'bottom' ? 1 - y : y) * COMPOSITION_HEIGHT);
}

function toLegacyPreset(preset: CaptionPreset): CaptionStylePreset {
  const font = getCaptionFont(preset.typography.font);
  return {
    name: preset.name,
    description: preset.description,
    fontSize: preset.typography.fontSize,
    color: preset.colors.text,
    // A `background` preset paints the box colour, not the glyph colour. ASS
    // cannot draw the box, so until the raster renderer takes those presets it
    // approximates with coloured glyphs — which is what it did before.
    highlightColor:
      preset.colors.activeBackground ?? preset.colors.activeText ?? preset.colors.text,
    font: font.family,
    fontWeight: font.bold ? 'bold' : 'normal',
    position: preset.layout.position,
    marginV: marginVFor(preset.layout.position),
  };
}

export const CAPTION_STYLES: Record<CaptionStyleName, CaptionStylePreset> = Object.fromEntries(
  getAllCaptionPresets().map((preset) => [preset.id, toLegacyPreset(preset)])
) as Record<CaptionStyleName, CaptionStylePreset>;

/** Get caption style preset by name, with fallback to 'classic' */
export function getCaptionStyle(styleName?: string): CaptionStylePreset {
  return CAPTION_STYLES[resolveStyleName(styleName)];
}

/** Get all available caption styles as array for UI rendering */
export function getAllCaptionStyles(): Array<{ key: CaptionStyleName; preset: CaptionStylePreset }> {
  return (Object.keys(CAPTION_STYLES) as CaptionStyleName[]).map((key) => ({
    key,
    preset: CAPTION_STYLES[key],
  }));
}
