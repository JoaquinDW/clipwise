/**
 * Caption Style Presets for Clipwise
 *
 * Defines different caption styling options that users can choose from
 * when uploading videos. Styles control font, size, colors, and positioning.
 */

export type CaptionStyleName = 'basic' | 'dynamic' | 'minimal';

export interface CaptionStylePreset {
  name: string;
  description: string;
  fontSize: number;
  color: string;
  highlightColor: string;
  font: string;
  fontWeight: 'normal' | 'bold';
  position: 'top' | 'center' | 'bottom';
  marginV: number; // Vertical margin in pixels for ASS format
}

export const CAPTION_STYLES: Record<CaptionStyleName, CaptionStylePreset> = {
  basic: {
    name: 'Basic',
    description: 'Clean white text with gold highlights at bottom',
    fontSize: 36,
    color: '#FFFFFF',
    highlightColor: '#FFD700', // Gold
    font: 'Arial',
    fontWeight: 'bold',
    position: 'bottom',
    marginV: 480, // 3/4 down the screen (for 1920x1080 base)
  },

  dynamic: {
    name: 'Dynamic',
    description: 'Bold impact text with red highlights, larger and centered',
    fontSize: 48,
    color: '#FFFFFF',
    highlightColor: '#FF0000', // Red
    font: 'Impact',
    fontWeight: 'bold',
    position: 'center',
    marginV: 540, // Center of screen
  },

  minimal: {
    name: 'Minimal',
    description: 'Subtle light gray text with blue highlights',
    fontSize: 32,
    color: '#E8E8E8',
    highlightColor: '#00A8FF', // Blue
    font: 'Helvetica',
    fontWeight: 'normal',
    position: 'bottom',
    marginV: 480,
  },
};

/**
 * Get caption style preset by name, with fallback to 'basic'
 */
export function getCaptionStyle(styleName?: string): CaptionStylePreset {
  if (!styleName || !(styleName in CAPTION_STYLES)) {
    return CAPTION_STYLES.basic;
  }
  return CAPTION_STYLES[styleName as CaptionStyleName];
}

/**
 * Get all available caption styles as array for UI rendering
 */
export function getAllCaptionStyles(): Array<{ key: CaptionStyleName; preset: CaptionStylePreset }> {
  return Object.entries(CAPTION_STYLES).map(([key, preset]) => ({
    key: key as CaptionStyleName,
    preset,
  }));
}
