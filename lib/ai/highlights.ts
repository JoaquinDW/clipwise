/**
 * AI-Powered Highlight Detection
 *
 * This module uses Vercel AI SDK to analyze video transcriptions
 * and identify viral-worthy moments for short-form content.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { defaultModels, checkAIConfiguration } from './providers';
import { TranscriptionSegment } from './transcribe';

/**
 * Schema for a single highlight
 */
const HighlightSchema = z.object({
  title: z.string().describe('Catchy title for this clip (max 100 chars)'),
  description: z.string().describe('Brief description of why this moment is engaging'),
  startTime: z.number().describe('Start time in seconds'),
  endTime: z.number().describe('End time in seconds'),
  hookText: z.string().describe('The hook or key phrase that makes this viral'),
  score: z.number().min(0).max(100).describe('Virality score (0-100)'),
  tags: z.array(z.string()).describe('Relevant tags (e.g., "funny", "emotional", "educational")'),
});

/**
 * Schema for the complete highlight detection result
 */
const HighlightsResultSchema = z.object({
  highlights: z.array(HighlightSchema).describe('Detected highlights ordered by score (highest first)'),
  summary: z.string().describe('Overall summary of the video content'),
  mainTopics: z.array(z.string()).describe('Main topics discussed in the video'),
});

export type Highlight = z.infer<typeof HighlightSchema>;
export type HighlightsResult = z.infer<typeof HighlightsResultSchema>;

/**
 * Detect highlights in a video transcription using AI
 *
 * @param segments - Transcription segments with timestamps
 * @param options - Configuration options
 * @returns Detected highlights with scores and metadata
 */
export async function detectHighlights(
  segments: TranscriptionSegment[],
  options?: {
    maxHighlights?: number; // Maximum number of highlights to return (default: 5)
    minDuration?: number; // Minimum clip duration in seconds (default: 15)
    maxDuration?: number; // Maximum clip duration in seconds (default: 60)
    targetAudience?: string; // Target audience (e.g., 'TikTok Gen-Z', 'LinkedIn professionals')
    contentType?: string; // Content type (e.g., 'podcast', 'tutorial', 'vlog')
  }
): Promise<HighlightsResult> {
  checkAIConfiguration();

  const {
    maxHighlights = 5,
    minDuration = 15,
    maxDuration = 60,
    targetAudience = 'social media users on TikTok, Instagram Reels, and YouTube Shorts',
    contentType = 'video content',
  } = options || {};

  // Build the prompt with transcription context
  const transcriptionText = segments
    .map((seg, idx) => `[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${seg.text}`)
    .join('\n');

  // Log first few segments to debug
  console.log(`📝 Sample transcription (first 3 segments):`);
  segments.slice(0, 3).forEach((seg, idx) => {
    console.log(`  ${idx + 1}. [${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s] ${seg.text}`);
  });

  const systemPrompt = buildSystemPrompt(targetAudience, contentType);
  const userPrompt = buildUserPrompt(
    transcriptionText,
    maxHighlights,
    minDuration,
    maxDuration
  );

  try {
    const result = await generateObject({
      model: defaultModels.highlightDetection,
      schema: HighlightsResultSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7, // Some creativity, but mostly consistent
    });

    console.log(`📊 AI returned ${result.object.highlights.length} highlights before validation`);

    // Log all highlights with their timestamps
    result.object.highlights.forEach((h, idx) => {
      console.log(`  ${idx + 1}. "${h.title}" - ${h.startTime.toFixed(1)}s to ${h.endTime.toFixed(1)}s (${(h.endTime - h.startTime).toFixed(1)}s, score: ${h.score})`);
    });

    // Validate and adjust highlights
    const validatedHighlights = result.object.highlights
      .filter(h => {
        const duration = h.endTime - h.startTime;
        const isValid = duration >= minDuration && duration <= maxDuration;
        if (!isValid) {
          console.log(`⚠️  Filtered out highlight "${h.title}" (duration: ${duration.toFixed(1)}s, required: ${minDuration}-${maxDuration}s)`);
        }
        return isValid;
      })
      .slice(0, maxHighlights);

    console.log(`✅ ${validatedHighlights.length} highlights passed validation`);

    return {
      ...result.object,
      highlights: validatedHighlights,
    };
  } catch (error) {
    console.error('Error detecting highlights:', error);
    throw new Error(`Failed to detect highlights: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build the system prompt for highlight detection
 */
function buildSystemPrompt(targetAudience: string, contentType: string): string {
  return `You are an expert content strategist specializing in creating viral short-form videos for ${targetAudience}.

Your role is to analyze ${contentType} transcriptions and identify the most engaging moments that would perform well as short vertical clips (9:16 format) on platforms like TikTok, Instagram Reels, and YouTube Shorts.

Key criteria for viral moments:
1. STRONG HOOK: Opens with an attention-grabbing statement or question
2. EMOTIONAL IMPACT: Evokes emotion (humor, surprise, inspiration, controversy)
3. SELF-CONTAINED: Makes sense without additional context
4. CLEAR VALUE: Provides entertainment, education, or inspiration
5. OPTIMAL LENGTH: 15-60 seconds (sweet spot: 20-40 seconds)
6. QUOTABLE: Contains memorable phrases or soundbites

CRITICAL - DURATION AND BOUNDARY REQUIREMENTS:
⚠️ Each highlight MUST be a COMPLETE SEGMENT of 15-60 seconds, NOT a single moment or phrase.
- You will receive transcription segments with timestamps like [0:00 - 0:05]
- startTime and endTime must span a COMPLETE TOPIC or STORY (15-60 seconds)
- DO NOT select tiny moments (1-2 seconds) - these will be rejected
- Look for natural start/end points that form a complete, engaging narrative

⚠️ COMPLETE SENTENCES REQUIRED:
- Clips MUST start at the BEGINNING of a sentence
- Clips MUST end at the END of a complete sentence
- NEVER cut off mid-sentence - viewers will notice and it looks unprofessional
- Start and end at natural speech boundaries (sentence endings, pauses)
- Ensure the clip feels complete and satisfying

EXAMPLES:
✓ CORRECT: startTime=45.0, endTime=70.0 (25 seconds - complete topic, ends at sentence boundary)
✓ CORRECT: startTime=120.0, endTime=155.0 (35 seconds - full story arc, complete sentences)
✗ WRONG: startTime=10.0, endTime=11.5 (1.5 seconds - too short!)
✗ WRONG: startTime=45.0, endTime=45.5 (0.5 seconds - single phrase, not a clip!)
✗ WRONG: Cutting mid-sentence "...and then I went to the sto-" - INCOMPLETE!

You should score each highlight on virality potential (0-100) based on:
- Hook strength (0-30 points)
- Emotional resonance (0-25 points)
- Clarity and self-containment (0-20 points)
- Entertainment/educational value (0-15 points)
- Quotability (0-10 points)

Always prioritize moments that would make someone STOP SCROLLING.`;
}

/**
 * Build the user prompt with transcription
 */
function buildUserPrompt(
  transcription: string,
  maxHighlights: number,
  minDuration: number,
  maxDuration: number
): string {
  return `Analyze this video transcription and identify the top ${maxHighlights} moments that would make great short-form clips.

⚠️ CRITICAL REQUIREMENTS:
1. DURATION: Each clip MUST be ${minDuration}-${maxDuration} seconds long
2. COMPLETE SENTENCES: Clips MUST start at the beginning of a sentence and end at the end of a complete sentence
3. NEVER cut off mid-sentence - this looks unprofessional and confuses viewers

TRANSCRIPTION (with timestamps in seconds):
${transcription}

INSTRUCTIONS FOR TIMESTAMP SELECTION:
1. Find the START of an engaging topic/story at a SENTENCE BEGINNING (this is your startTime)
2. Find where that topic CONCLUDES at a SENTENCE ENDING, ensuring it's ${minDuration}-${maxDuration} seconds later (this is your endTime)
3. The segment must be self-contained, complete, and NOT cut off mid-sentence
4. DO NOT just pick a single sentence - you need the full context (intro + body + conclusion)
5. Ensure the last word before endTime is the end of a complete sentence (period, question mark, exclamation)

EXAMPLE:
If you see:
[0:15 - 0:18] "I'm going to tell you something crazy"
[0:18 - 0:25] "Most apps fail not because of the product"
[0:25 - 0:32] "but because nobody knows they exist"
[0:32 - 0:40] "This is why marketing matters from day one"

Then a good highlight would be:
startTime: 15.0
endTime: 40.0
(Duration: 25 seconds ✓)

Identify the most viral-worthy moments and explain why each would perform well. Order them by virality score (highest first).`;
}

/**
 * Format time in MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get highlights filtered by minimum score
 */
export function filterHighlightsByScore(
  highlights: Highlight[],
  minScore: number
): Highlight[] {
  return highlights.filter(h => h.score >= minScore);
}

/**
 * Get the best highlight (highest score)
 */
export function getBestHighlight(highlights: Highlight[]): Highlight | null {
  if (highlights.length === 0) return null;
  return highlights.reduce((best, current) =>
    current.score > best.score ? current : best
  );
}
