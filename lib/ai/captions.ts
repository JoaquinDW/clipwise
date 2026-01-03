/**
 * AI-Powered Caption Generation
 *
 * This module generates optimized captions for short-form video clips
 * with timing, styling, and engagement optimization.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { defaultModels, checkAIConfiguration } from './providers';
import { TranscriptionSegment, WordTimestamp } from './transcribe';

/**
 * Schema for a single word in a caption with highlight timing
 */
const CaptionWordSchema = z.object({
  word: z.string().describe('Individual word'),
  startTime: z.number().describe('Word start time in seconds'),
  endTime: z.number().describe('Word end time in seconds'),
  emphasis: z.boolean().describe('Whether to emphasize this word'),
});

/**
 * Schema for a single caption segment (group of 2-4 words)
 */
const CaptionSegmentSchema = z.object({
  startTime: z.number().describe('Start time in seconds'),
  endTime: z.number().describe('End time in seconds'),
  words: z.array(CaptionWordSchema).describe('Words in this caption segment with individual timings'),
  position: z.enum(['top', 'center', 'bottom']).describe('Position on screen'),
});

/**
 * Schema for the complete caption result
 */
const CaptionsResultSchema = z.object({
  captions: z.array(CaptionSegmentSchema).describe('Optimized caption segments (2-4 words each)'),
  style: z.object({
    fontSize: z.number().describe('Font size in pixels (recommended: 36)'),
    color: z.string().describe('Text color (hex, default: white)'),
    highlightColor: z.string().describe('Highlight background color for active word (hex, e.g., yellow)'),
  }),
  hook: z.string().describe('Opening hook text to overlay (first 2-3 seconds)'),
});

export type CaptionWord = z.infer<typeof CaptionWordSchema>;
export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;
export type CaptionsResult = z.infer<typeof CaptionsResultSchema>;

/**
 * Generate optimized captions for a video clip with word-level highlighting
 *
 * @param words - Word-level timestamps from Whisper transcription
 * @param options - Configuration options
 * @returns Optimized captions with word-by-word timing for highlighting
 */
export async function generateCaptions(
  words: WordTimestamp[],
  options?: {
    maxWordsPerSegment?: number; // Max words per caption (default: 3, range: 2-4)
    emphasizeKeywords?: boolean; // Emphasize important words (default: true)
    includeHook?: boolean; // Generate opening hook overlay (default: true)
    language?: string; // Language of the video (e.g., 'en', 'es', 'fr')
  }
): Promise<CaptionsResult> {
  checkAIConfiguration();

  const {
    maxWordsPerSegment = 3,
    emphasizeKeywords = true,
    includeHook = true,
    language = 'en',
  } = options || {};

  // Build the prompt with word-level data
  const transcriptionText = words
    .map((w) => `[${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s] ${w.word}`)
    .join('\n');

  const systemPrompt = buildCaptionSystemPrompt(language);
  const userPrompt = buildCaptionUserPrompt(
    transcriptionText,
    maxWordsPerSegment,
    emphasizeKeywords,
    includeHook,
    language
  );

  try {
    const result = await generateObject({
      model: defaultModels.captionGeneration,
      schema: CaptionsResultSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0, // Completely deterministic - no hallucination allowed
    });

    // Validate that AI didn't hallucinate words
    const originalWords = new Set(words.map(w => w.word.toLowerCase().trim()));
    const captionWords = result.object.captions.flatMap(seg =>
      seg.words.map(w => w.word.toLowerCase().trim())
    );

    const hallucinatedWords = captionWords.filter(w => !originalWords.has(w));

    if (hallucinatedWords.length > 0) {
      console.error('⚠️ AI HALLUCINATION DETECTED!');
      console.error('Hallucinated words:', hallucinatedWords);
      console.error('Original words:', Array.from(originalWords));
      throw new Error(`AI hallucinated words not in transcription: ${hallucinatedWords.join(', ')}`);
    }

    console.log(`✅ Caption validation passed - all words from original transcription`);
    return result.object;
  } catch (error) {
    console.error('Error generating captions:', error);
    throw new Error(
      `Failed to generate captions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build system prompt for caption generation
 */
function buildCaptionSystemPrompt(language: string): string {
  const languageNames: Record<string, string> = {
    en: 'English',
    es: 'Spanish (Español)',
    fr: 'French (Français)',
    de: 'German (Deutsch)',
    it: 'Italian (Italiano)',
    pt: 'Portuguese (Português)',
    nl: 'Dutch (Nederlands)',
    pl: 'Polish (Polski)',
    ru: 'Russian (Русский)',
    ja: 'Japanese (日本語)',
    zh: 'Chinese (中文)',
    ko: 'Korean (한국어)',
    ar: 'Arabic (العربية)',
  };

  const languageName = languageNames[language] || language;

  return `You are a caption grouping assistant for short-form vertical videos (TikTok, Reels, Shorts).

⚠️ CRITICAL - DO NOT INVENT OR CHANGE TEXT:
- You MUST use the EXACT words from the transcription provided
- DO NOT create new text, paraphrase, or summarize
- DO NOT translate or change ANY words
- Your ONLY job is to GROUP the existing words into segments of 2-4 words
- The video is in ${languageName} - keep it that way

Your task:
1. Take the word-by-word transcription provided
2. Group consecutive words into segments of 2-4 words each
3. Keep the EXACT word text and timing from the transcription
4. Break at natural speech pauses when possible
5. Mark emphasis on important words (numbers, hooks, key phrases)

Rules:
- Each segment: 2-4 words from the transcription (no more, no less)
- Use the EXACT word text provided - do not modify, translate, or paraphrase
- Keep the exact startTime and endTime for each word
- Position: always 'bottom'
- If a word appears in the transcription, it MUST appear in your output
- If a word doesn't appear in the transcription, DO NOT add it

Styling:
- fontSize: 36 pixels
- color: white (#FFFFFF)
- highlightColor: yellow (#FFD700), orange (#FF6B35), or red (#FF0000)

Example:
Input: [0.5s-0.8s] "Hola" [0.8s-1.2s] "esto" [1.2s-1.5s] "es" [1.5s-2.0s] "importante"
Output: Segment 1: ["Hola", "esto"] (0.5s-1.2s), Segment 2: ["es", "importante"] (1.2s-2.0s)
DO NOT output: ["Bienvenidos", "al", "canal"] - these words were NOT in the input!`;
}

/**
 * Build user prompt for caption generation
 */
function buildCaptionUserPrompt(
  transcription: string,
  maxWordsPerSegment: number,
  emphasizeKeywords: boolean,
  includeHook: boolean,
  language: string
): string {
  const languageNames: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    pl: 'Polish',
    ru: 'Russian',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    ar: 'Arabic',
  };

  const languageName = languageNames[language] || language;

  return `Group the following words into caption segments for display.

⚠️ CRITICAL RULES:
1. Use ONLY the words listed below - DO NOT add, remove, or change ANY words
2. DO NOT invent new text - only group the existing words
3. DO NOT translate - keep words exactly as written
4. Each segment must have 2-4 consecutive words from the list
5. Keep the exact timing (startTime, endTime) for each word

WORD-BY-WORD TRANSCRIPTION (these are the ONLY words you can use):
${transcription}

TASK:
- Group these words into segments of ${maxWordsPerSegment} words each
- Use EXACTLY the same word text shown above
- Keep EXACTLY the same timing shown above
- ${emphasizeKeywords ? 'Mark keywords (numbers, important words) with emphasis=true' : 'No emphasis'}
- ${includeHook ? `Create a hook from the FIRST FEW WORDS of the transcription (max 2-3 seconds)` : 'No hook needed'}
- All segments: position='bottom'
- Font size: 36
- Color: white (#FFFFFF)
- Highlight color: choose yellow, orange, or red

EXAMPLE (if input was):
[0.0-0.5] "Hola"
[0.5-0.8] "a"
[0.8-1.2] "todos"
[1.2-1.8] "hoy"
[1.8-2.3] "vamos"

CORRECT output:
- Segment 1: words=[{word:"Hola", startTime:0.0, endTime:0.5}, {word:"a", startTime:0.5, endTime:0.8}, {word:"todos", startTime:0.8, endTime:1.2}]
- Segment 2: words=[{word:"hoy", startTime:1.2, endTime:1.8}, {word:"vamos", startTime:1.8, endTime:2.3}]

WRONG output (DO NOT DO THIS):
- words=[{word:"Bienvenidos"...}] ❌ This word was NOT in the input!
- words=[{word:"hello"...}] ❌ This is translation, NOT allowed!

Remember: ONLY use words from the transcription above. NO additions, NO changes, NO translations.`;
}

/**
 * Convert captions to ASS format with word-by-word karaoke highlighting
 *
 * ASS (Advanced SubStation Alpha) format supports karaoke effects where individual
 * words can be highlighted as they're spoken, similar to TikTok/Reels captions.
 *
 * @param captionsResult - Complete caption result with styling
 * @returns ASS subtitle file content
 */
export function captionsToASS(captionsResult: CaptionsResult): string {
  const { captions, style } = captionsResult;

  // ASS file header with script info and styles
  // MarginV for bottom positioning: smaller value = closer to bottom
  // For 1920px height, we want captions at ~1440px (3/4), so MarginV = 480px from bottom
  const header = `[Script Info]
Title: Clipwise Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${style.fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,2,1,2,10,10,480,1
Style: Highlight,Arial,${style.fontSize},${hexToASSColor(style.highlightColor)},${hexToASSColor(style.highlightColor)},&H00000000,${hexToASSColor(style.highlightColor, 0.8)},1,0,0,0,100,100,0,0,1,2,1,2,10,10,480,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Generate dialogue lines with karaoke effect for each caption segment
  const events = captions.map((segment) => {
    return generateKaraokeEvents(segment, style);
  }).join('');

  return header + events;
}

/**
 * Generate ASS karaoke events for a caption segment with word-by-word highlighting
 */
function generateKaraokeEvents(segment: CaptionSegment, style: CaptionsResult['style']): string {
  const { words, startTime, endTime } = segment;

  // Create one event per word for precise highlighting
  return words.map((word) => {
    const start = formatASSTime(word.startTime);
    const end = formatASSTime(word.endTime);
    const wordStyle = word.emphasis ? 'Highlight' : 'Highlight'; // Always use highlight style for active word

    // Build the full text with the current word highlighted
    const fullText = words.map((w) => {
      if (w.word === word.word && w.startTime === word.startTime) {
        // This is the active word - highlight it with background box
        return `{\\1c${hexToASSColor(style.highlightColor)}\\3c&H00000000\\bord3}${w.word}`;
      } else {
        // Inactive words - show in default white
        return `{\\1c&H00FFFFFF\\3c&H00000000\\bord2}${w.word}`;
      }
    }).join(' ');

    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${fullText}\n`;
  }).join('');
}

/**
 * Format time for ASS (H:MM:SS.cc)
 */
function formatASSTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);

  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

/**
 * Convert hex color to ASS color format (&HAABBGGRR)
 * ASS uses BGR order with alpha channel
 *
 * @param hex - Hex color (e.g., '#FFD700' or 'FFD700')
 * @param alpha - Alpha value 0-1 (default: 1 = fully opaque)
 */
function hexToASSColor(hex: string, alpha: number = 1): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Convert alpha to 0-255 (ASS format)
  const a = Math.round((1 - alpha) * 255); // Inverted: 0 = opaque, 255 = transparent

  // Format as &HAABBGGRR
  return `&H${a.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${r.toString(16).padStart(2, '0').toUpperCase()}`;
}
