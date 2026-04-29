export type CaptionStyleName = 'classic' | 'bold' | 'minimal' | 'viral' | 'podcast';

// Legacy names from before V1.5 — map to new names for backward compatibility
const LEGACY_STYLE_MAP: Record<string, CaptionStyleName> = {
  basic: 'classic',
  dynamic: 'bold',
};

const ALL_STYLE_KEYS = new Set<string>(['classic', 'bold', 'minimal', 'viral', 'podcast']);

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
  classic: {
    name: 'Classic',
    description: 'Clean white text with gold highlights at bottom',
    fontSize: 36,
    color: '#FFFFFF',
    highlightColor: '#FFD700',
    font: 'Arial',
    fontWeight: 'bold',
    position: 'bottom',
    marginV: 480,
  },
  bold: {
    name: 'Bold',
    description: 'Impact text with red highlights, large and center',
    fontSize: 48,
    color: '#FFFFFF',
    highlightColor: '#FF0000',
    font: 'Impact',
    fontWeight: 'bold',
    position: 'center',
    marginV: 540,
  },
  minimal: {
    name: 'Minimal',
    description: 'Subtle light gray text with blue highlights',
    fontSize: 32,
    color: '#E8E8E8',
    highlightColor: '#00A8FF',
    font: 'Helvetica',
    fontWeight: 'normal',
    position: 'bottom',
    marginV: 480,
  },
  viral: {
    name: 'Viral',
    description: 'TikTok-native style with orange fill and black stroke',
    fontSize: 42,
    color: '#FFFFFF',
    highlightColor: '#FF6B00',
    font: 'Arial Black',
    fontWeight: 'bold',
    position: 'center',
    marginV: 540,
  },
  podcast: {
    name: 'Podcast',
    description: 'Centered, muted style for interview and podcast clips',
    fontSize: 34,
    color: '#F0F0F0',
    highlightColor: '#FFFFFF',
    font: 'Georgia',
    fontWeight: 'normal',
    position: 'center',
    marginV: 540,
  },
};

// CSS style config for live preview overlay (not ASS burn)
export interface CaptionCSSPreset {
  fontFamily: string;
  fontWeight: string;
  baseFontSize: number; // px, multiplied by size factor
  color: string;
  highlightColor: string;
  highlightStyle: 'background' | 'color' | 'underline';
  textTransform: 'none' | 'uppercase';
  letterSpacing: string;
  textShadow: string;
}

const SIZE_MULTIPLIERS = { small: 0.75, medium: 1.0, large: 1.3 } as const;

const CAPTION_CSS_PRESETS: Record<CaptionStyleName, CaptionCSSPreset> = {
  classic: {
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    baseFontSize: 18,
    color: '#FFFFFF',
    highlightColor: '#FFD700',
    highlightStyle: 'background',
    textTransform: 'none',
    letterSpacing: '0px',
    textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
  },
  bold: {
    fontFamily: 'Impact, Arial Black, sans-serif',
    fontWeight: 'bold',
    baseFontSize: 22,
    color: '#FFFFFF',
    highlightColor: '#FF0000',
    highlightStyle: 'color',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    textShadow: '2px 2px 0px #000000',
  },
  minimal: {
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontWeight: 'normal',
    baseFontSize: 16,
    color: '#E8E8E8',
    highlightColor: '#00A8FF',
    highlightStyle: 'underline',
    textTransform: 'none',
    letterSpacing: '0.5px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
  },
  viral: {
    fontFamily: '"Arial Black", Impact, sans-serif',
    fontWeight: '900',
    baseFontSize: 20,
    color: '#FFFFFF',
    highlightColor: '#FF6B00',
    highlightStyle: 'background',
    textTransform: 'none',
    letterSpacing: '0.5px',
    textShadow: '2px 2px 0px #000000, -1px -1px 0px #000000',
  },
  podcast: {
    fontFamily: 'Georgia, serif',
    fontWeight: 'normal',
    baseFontSize: 17,
    color: '#F0F0F0',
    highlightColor: '#FFFFFF',
    highlightStyle: 'color',
    textTransform: 'none',
    letterSpacing: '0.3px',
    textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
  },
};

export interface CaptionCSSStyle {
  container: React.CSSProperties;
  word: React.CSSProperties;
  highlight: React.CSSProperties;
}

export function getCaptionCSSStyle(
  styleName: string | undefined | null,
  opts: {
    captionPosition?: 'top' | 'center' | 'bottom';
    captionSize?: 'small' | 'medium' | 'large';
  } = {}
): CaptionCSSStyle {
  const resolvedName = resolveStyleName(styleName);
  const preset = CAPTION_CSS_PRESETS[resolvedName];
  const sizeMultiplier = SIZE_MULTIPLIERS[opts.captionSize ?? 'medium'];
  const fontSize = Math.round(preset.baseFontSize * sizeMultiplier);

  const positionStyle: React.CSSProperties = (() => {
    switch (opts.captionPosition ?? 'bottom') {
      case 'top': return { top: '8%' };
      case 'center': return { top: '50%', transform: 'translateY(-50%)' };
      case 'bottom': return { bottom: '15%' };
    }
  })();

  const container: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    padding: '0 12px',
    pointerEvents: 'none',
    ...positionStyle,
  };

  const word: React.CSSProperties = {
    fontFamily: preset.fontFamily,
    fontWeight: preset.fontWeight,
    fontSize: `${fontSize}px`,
    color: preset.color,
    textTransform: preset.textTransform,
    letterSpacing: preset.letterSpacing,
    textShadow: preset.textShadow,
    display: 'inline',
  };

  const highlight: React.CSSProperties = {
    ...word,
    ...(preset.highlightStyle === 'background' ? {
      backgroundColor: preset.highlightColor,
      color: '#000000',
      borderRadius: '2px',
      padding: '0 2px',
    } : preset.highlightStyle === 'color' ? {
      color: preset.highlightColor,
    } : {
      color: preset.highlightColor,
      textDecoration: 'underline',
      textDecorationColor: preset.highlightColor,
    }),
  };

  return { container, word, highlight };
}

/**
 * Resolve a style name, handling legacy aliases and unknown values.
 */
function resolveStyleName(styleName?: string | null): CaptionStyleName {
  if (!styleName) return 'classic';
  if (styleName in LEGACY_STYLE_MAP) return LEGACY_STYLE_MAP[styleName];
  if (ALL_STYLE_KEYS.has(styleName)) return styleName as CaptionStyleName;
  return 'classic';
}

/**
 * Get caption style preset by name, with fallback to 'classic'
 */
export function getCaptionStyle(styleName?: string): CaptionStylePreset {
  return CAPTION_STYLES[resolveStyleName(styleName)];
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

/**
 * Validate a style name — used by API routes to reject unknown values.
 */
export function isValidCaptionStyleName(name: string): boolean {
  return ALL_STYLE_KEYS.has(name) || name in LEGACY_STYLE_MAP;
}
