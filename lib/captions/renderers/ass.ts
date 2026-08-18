/**
 * ASS renderer — the fast path.
 *
 * libass runs inside the crop encode that happens anyway, so a preset it can
 * express costs nothing extra. What changed is that it no longer *decides*
 * anything: it used to pick its own margins, its own wrap width (in a 2560-wide
 * space it inferred because PlayResX was missing) and its own line breaks, which
 * is why the burned file never matched the preview.
 *
 * Now every word arrives with a position from the shared layout engine and is
 * emitted with an explicit \pos. libass only rasterises glyphs.
 */

import type { CaptionFrame } from '../layout';
import { getCaptionFont } from '../fonts';
import { COMPOSITION_HEIGHT, COMPOSITION_WIDTH, type CaptionPreset } from '../presets';

/** ASS alignment 4: middle-left. \pos then addresses the left edge, vertically centred. */
const ALIGNMENT_MIDDLE_LEFT = 4;

/**
 * Convert a CSS colour to ASS `&HAABBGGRR`.
 *
 * ASS is BGR with an *inverted* alpha channel, where 00 is opaque.
 */
export function toASSColour(css: string): string {
  const { r, g, b, a } = parseColour(css);
  const alpha = Math.round((1 - a) * 255);
  const hex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `&H${hex(alpha)}${hex(b)}${hex(g)}${hex(r)}`;
}

function parseColour(css: string): { r: number; g: number; b: number; a: number } {
  const trimmed = css.trim();

  const rgba = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => parseFloat(p.trim()));
    return { r: parts[0] | 0, g: parts[1] | 0, b: parts[2] | 0, a: parts[3] ?? 1 };
  }

  const hex = trimmed.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
    a: 1,
  };
}

/**
 * Format seconds as ASS `H:MM:SS.cc`.
 *
 * Clamped at zero: a trim that cuts mid-word used to leave the word with a
 * negative start, which formatted as `0:00:-1.-50` and made libass drop the
 * line silently.
 */
export function formatASSTime(seconds: number): string {
  const t = Math.max(0, seconds);
  const hours = Math.floor(t / 3600);
  const minutes = Math.floor((t % 3600) / 60);
  const secs = Math.floor(t % 60);
  const centis = Math.floor((t % 1) * 100);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${hours}:${pad(minutes)}:${pad(secs)}.${pad(centis)}`;
}

/**
 * `{` opens an override block and `\` opens a tag. Neither can appear in a
 * transcript word without corrupting the line, and neither carries meaning here.
 */
function escapeASSText(text: string): string {
  return text.replace(/\\/g, '/').replace(/[{}]/g, '');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * ASS `Fontsize` that renders at the same em size the canvas draws at.
 *
 * libass sizes text by its ascender-to-descender span; Canvas2D sizes it by the
 * em square. The ratio is a property of the font file, so the conversion is too.
 */
function assFontSize(preset: CaptionPreset, emSize: number): number {
  return Math.round(emSize * getCaptionFont(preset.typography.font).metrics.sizeRatio);
}

/**
 * Distance from a word's baseline up to the vertical centre of libass's line
 * box, which is what alignment 4 anchors `\pos` to.
 */
function baselineToAssCentre(preset: CaptionPreset, emSize: number): number {
  const { ascentRatio, descentRatio } = getCaptionFont(preset.typography.font).metrics;
  return (emSize * (ascentRatio - descentRatio)) / 2;
}

function styleLine(
  name: string,
  preset: CaptionPreset,
  fontSize: number,
  colour: string,
  underline: boolean
): string {
  const font = getCaptionFont(preset.typography.font);
  const bold = font.bold ? -1 : 0;

  // Outline and shadow are authored in composition px. `ScaledBorderAndShadow:
  // yes` makes libass scale them along with the frame, so a 720x1280 render gets
  // proportionally thinner strokes instead of the same absolute ones.
  const outline = preset.stroke?.width ?? 0;
  const outlineColour = toASSColour(preset.colors.stroke ?? '#000000');

  // ASS shadows are a fixed diagonal offset with no blur, so only the offset
  // survives. Every preset that reaches this renderer has offsetX === offsetY.
  const shadow = preset.shadow ? Math.round(preset.shadow.offsetX) : 0;
  const shadowColour = toASSColour(preset.colors.shadow ?? 'rgba(0,0,0,0)');

  return [
    `Style: ${name}`,
    font.family,
    String(assFontSize(preset, fontSize)),
    colour,
    colour,
    outlineColour,
    shadowColour,
    String(bold),
    '0', // Italic
    underline ? '-1' : '0',
    '0', // StrikeOut
    '100', // ScaleX
    '100', // ScaleY
    // The layout engine positions whole words, so it accounts for tracking
    // *between* words but not within one. libass has to add it inside each word,
    // or every word renders narrower here than on the canvas.
    String(round2(preset.typography.letterSpacing * (fontSize / preset.typography.fontSize))),
    '0', // Angle
    '1', // BorderStyle: outline + shadow
    String(outline),
    String(shadow),
    String(ALIGNMENT_MIDDLE_LEFT),
    '0', // MarginL — \pos supersedes margins
    '0', // MarginR
    '0', // MarginV
    '1', // Encoding
  ].join(',');
}

/** Colour of the active word's glyphs under this preset. */
function activeColour(preset: CaptionPreset): string {
  const mode = preset.highlight.mode;
  if (mode === 'none') return preset.colors.text;
  // `background` presets route to the raster renderer; if one lands here anyway,
  // the box colour on the glyphs is the closest ASS can get.
  if (mode === 'background') {
    return preset.colors.activeBackground ?? preset.colors.activeText ?? preset.colors.text;
  }
  return preset.colors.activeText ?? preset.colors.text;
}

/**
 * Render laid-out frames as an ASS subtitle file.
 *
 * Returns null when there is nothing to draw, so callers can skip the filter
 * entirely rather than burning an empty subtitle track.
 */
export function renderFramesToASS(frames: CaptionFrame[]): string | null {
  if (frames.length === 0) return null;

  const preset = frames[0].preset;
  const fontSize = frames[0].fontSize;
  const underline = preset.highlight.mode === 'underline';

  const header = `[Script Info]
Title: Momentreel Captions
ScriptType: v4.00+
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: ${COMPOSITION_WIDTH}
PlayResY: ${COMPOSITION_HEIGHT}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styleLine('Base', preset, fontSize, toASSColour(preset.colors.text), false)}
${styleLine('Active', preset, fontSize, toASSColour(activeColour(preset)), underline)}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = frames
    .flatMap((frame) => {
      const start = formatASSTime(frame.start);
      const end = formatASSTime(frame.end);

      return frame.words.map((word) => {
        // Alignment 4 anchors the left edge at the vertical centre of libass's
        // own line box, which is the font's ascender-to-descender span and not
        // the layout's line height. Positioning from the baseline the canvas
        // draws on — then stepping up by half that span — makes the two agree
        // whatever the font's metrics happen to be.
        const x = Math.round(word.x);
        const y = Math.round(
          word.y + word.baseline - baselineToAssCentre(preset, frame.fontSize)
        );
        const style = word.active ? 'Active' : 'Base';
        return `Dialogue: 0,${start},${end},${style},,0,0,0,,{\\pos(${x},${y})}${escapeASSText(word.text)}`;
      });
    })
    .join('\n');

  return `${header}${events}\n`;
}
