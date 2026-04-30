/* eslint-disable @typescript-eslint/no-unused-vars */
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
 * Composite layout type for multi-region 9:16 compositions
 */
const LayoutTypeSchema = z.enum([
  'talking_head',
  'interview_split',
  'gameplay_cam',
  'tutorial_pip',
  'standard',
]).describe(
  'talking_head = single person centered; ' +
  'interview_split = two people side-by-side stacked 50/50; ' +
  'gameplay_cam = face cam top 30% + gameplay bottom 70%; ' +
  'tutorial_pip = full screen content + small face overlay corner; ' +
  'standard = use cropStrategy only (fallback)'
);

/**
 * A source/destination region for composite layouts (all values are fractions 0.0–1.0)
 */
const LayoutRegionSchema = z.object({
  regionId: z.string().describe('Identifier e.g. "face", "gameplay", "person_a"'),
  sourceX: z.number().min(0).max(1).describe('Left edge of region in source video (fraction of source width)'),
  sourceY: z.number().min(0).max(1).describe('Top edge of region in source video (fraction of source height)'),
  sourceW: z.number().min(0).max(1).describe('Width of region in source video (fraction of source width)'),
  sourceH: z.number().min(0).max(1).describe('Height of region in source video (fraction of source height)'),
  destY: z.number().min(0).max(1).describe('Top edge of region in 1080x1920 output (fraction of 1920)'),
  destH: z.number().min(0).max(1).describe('Height of region in 1080x1920 output (fraction of 1920)'),
});

/**
 * Crop strategy for vertical video formatting
 */
const CropStrategySchema = z.object({
  method: z.enum(['track_speaker', 'track_action', 'wide_shot', 'blur_sides'])
    .describe('Crop method: track_speaker (follow person speaking), track_action (follow movement), wide_shot (static center), blur_sides (blurred letterbox for groups OR educational_visual content)'),
  subjectPosition: z.enum(['left', 'center', 'right'])
    .describe('Expected position of main subject in frame'),
  sceneType: z.enum(['single_person', 'multiple_people', 'group', 'landscape', 'screen_recording', 'educational_visual'])
    .describe('Scene composition type'),
  reasoning: z.string().describe('Brief explanation of why this crop strategy was chosen'),
});

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
  cropStrategy: CropStrategySchema.describe('Intelligent crop strategy for converting to vertical 9:16 format'),
  layoutType: LayoutTypeSchema
    .describe('Composite layout type for the 9:16 output. Use "standard" to fall back to cropStrategy.'),
  layoutRegions: z.array(LayoutRegionSchema)
    .describe(
      'Only for interview_split, gameplay_cam, tutorial_pip. ' +
      'Defines source crop regions and their destination positions in the 1080x1920 output. ' +
      'For standard/talking_head use an empty array.'
    ),
});

/**
 * Schema for the complete highlight detection result
 */
const HighlightsResultSchema = z.object({
  highlights: z.array(HighlightSchema).describe('Detected highlights ordered by score (highest first)'),
  summary: z.string().describe('Overall summary of the video content'),
  mainTopics: z.array(z.string()).describe('Main topics discussed in the video'),
});

export type CropStrategy = z.infer<typeof CropStrategySchema>;
export type LayoutType = z.infer<typeof LayoutTypeSchema>;
export type LayoutRegion = z.infer<typeof LayoutRegionSchema>;
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

Always prioritize moments that would make someone STOP SCROLLING.

═══════════════════════════════════════════════════════════════
🎬 SMART CROP STRATEGY SELECTION (V2 Engine)
═══════════════════════════════════════════════════════════════

For EACH highlight, you must analyze the scene composition and select the optimal crop strategy for converting horizontal video to vertical 9:16 format.

CROP METHOD OPTIONS:

1. "track_speaker" - Single Person Talking Head
   ✓ Use when: One person speaking directly to camera or being interviewed
   ✓ Scene type: single_person
   ✓ Effect: Smooth tracking that follows the speaker's face/upper body
   ✓ Example: Podcast interviews, talking head videos, testimonials
   ✓ Position: Usually 'center', but 'left' or 'right' if speaker is off-center

2. "track_action" - Dynamic Movement/Demonstrations
   ✓ Use when: Person is moving, demonstrating, or performing actions
   ✓ Scene type: single_person (but active)
   ✓ Effect: Follows the subject's movement smoothly across the frame
   ✓ Example: Cooking demos, workouts, product reviews with hand movements
   ✓ Position: Varies based on movement direction

3. "wide_shot" - Static Scene with No Clear Subject
   ✓ Use when: Landscape, B-roll, establishing shots, or static screen recordings
   ✓ Scene type: landscape, screen_recording
   ✓ Effect: Simple center crop with no tracking (current default behavior)
   ✓ Example: Nature shots, cityscapes, screencasts with minimal movement
   ✓ Position: Always 'center'

4. "blur_sides" - Multiple People or Group Shots
   ✓ Use when: 2+ people in frame, panel discussions, group conversations
   ✓ Scene type: multiple_people, group
   ✓ Effect: Preserves full width with blurred letterbox background (cinematic look)
   ✓ Example: Panel discussions, interviews with 2+ people, group reactions
   ✓ Position: Always 'center' (shows full width)

5. "blur_sides" (educational_visual) — Whiteboard / Chalkboard / Animated Diagram
   ✓ Use when: Screen shows text cards, data structure diagrams, hand-drawn visuals,
     animated educational cards, chalkboard-style explainers, or slide-style content
   ✓ Scene type: educational_visual
   ✓ Effect: Preserves FULL WIDTH of the visual — no content is cut off.
     Blurred letterbox fills vertical space above/below.
   ✓ Transcription clues (any of these signal this type):
     - Conceptual explanation phrases: "think of it like", "imagine", "picture this",
       "the idea is", "what this means is", "let me explain"
     - Present-tense definitional language: "this is", "it works like", "best for",
       "the difference between", "unlike X, Y does", "think of X as Y"
     - CS / data structures vocabulary: stack, queue, linked list, array, tree, graph,
       node, pointer, recursion, algorithm, function, loop, variable, complexity, Big O
     - General educational terms: "the concept of", "by definition", "in other words",
       "for example", "this represents", "notice that"
   ✓ Position: Always 'center'
   ✗ Do NOT confuse with tutorial_pip: educational_visual has NO software click
     instructions, no "click here", "navigate to", or named UI elements to interact with

DECISION TREE FOR CROP STRATEGY:

Ask yourself these questions based on the transcription content:

0️⃣ "Is the content educational visual — text cards, diagrams, or animated concepts on screen?"
   → YES (conceptual language, CS/data terms, definitional phrases, no software click instructions)?
     → Use "blur_sides", sceneType: "educational_visual"
   → NO → Go to question 1️⃣

1️⃣ "How many people are likely in the frame?"
   → 1 person speaking? → Go to question 2️⃣
   → 2+ people? → Use "blur_sides", sceneType: "group"
   → No people (landscape or software screencast with click instructions)? → Use "wide_shot"

2️⃣ "Is the single person moving or static?"
   → Static talking head (podcast, interview)? → Use "track_speaker"
   → Active/demonstrating (cooking, workout)? → Use "track_action"

3️⃣ "Where is the subject likely positioned?"
   → Usually center, but analyze context:
   → Interview setting → 'center'
   → Side-by-side comparison → 'left' or 'right'
   → Presenter with graphics → 'left' or 'right'

EXAMPLES OF CROP STRATEGY REASONING:

✓ GOOD REASONING:
"Single person podcast interview discussing marketing strategies. Speaker is likely centered in frame addressing the camera directly. Use track_speaker for smooth face tracking."

✓ GOOD REASONING:
"Cooking demonstration showing how to chop vegetables. Chef is actively moving hands and ingredients. Use track_action to follow the hands and ingredients smoothly."

✓ GOOD REASONING:
"Panel discussion with three hosts debating tech trends. Multiple people in frame require preserving width. Use blur_sides for cinematic letterbox effect."

✓ GOOD REASONING:
"Screen recording showing how to use Photoshop tools. No person visible, just software interface. Use wide_shot for static center crop."

✓ GOOD REASONING:
"Chalkboard-style explainer showing data structures (Stack, Queue, Linked List) as animated cards on a black background. Transcript uses 'think of it like', 'what this means is', and references stack/queue/linked list — educational_visual clues. No software click instructions. Full frame width must be preserved — blur_sides shows all cards with blurred letterbox fill."

✗ BAD REASONING:
"Use track_speaker" (no explanation - rejected!)

✗ BAD REASONING:
"Probably blur_sides because it looks cool" (not based on scene analysis - rejected!)

CRITICAL RULES:
- ALWAYS provide reasoning for your crop strategy choice
- Base decisions on transcription content clues (e.g., "I'm going to show you" = track_action, "Let's discuss" with multiple voices = blur_sides)
- When uncertain, default to "track_speaker" for single-person content or "blur_sides" for multi-person
- sceneType must match the crop method logically
- subjectPosition should reflect the likely framing based on content type

═══════════════════════════════════════════════════════════════
🖼️  COMPOSITE LAYOUT DETECTION (V3 Engine)
═══════════════════════════════════════════════════════════════

For EACH highlight, also choose the best layoutType. The layout controls how the
1080x1920 output is COMPOSED — not just which region to crop.

LAYOUT TYPES:

1. "talking_head" — Single person, standard vertical
   → cropStrategy: track_speaker or track_action
   → layoutRegions: omit

2. "interview_split" — Two people side-by-side in the SAME frame
   Transcription clues: clear turn-taking dialogue, Q&A exchanges, two distinct voices,
   "Host:" / "Guest:" labels, "what do you think about...", alternating questions/answers
   → Default layoutRegions:
     { regionId:"person_a", sourceX:0.0, sourceY:0.0, sourceW:0.5, sourceH:1.0, destY:0.0, destH:0.5 }
     { regionId:"person_b", sourceX:0.5, sourceY:0.0, sourceW:0.5, sourceH:1.0, destY:0.5, destH:1.0 }

3. "gameplay_cam" — Gaming stream with face cam embedded in corner of source video
   Transcription clues: gaming terms (kill/clutch/round/ranked/farm/rotate/push/defending),
   platform terms (chat/subs/viewers/Twitch/stream), reactions ("let's go!", "got him!", "too close"),
   gameplay commentary ("I'm going to rush", "rotating here", "full send")
   → Face cam is typically in the TOP-LEFT corner of the source video
   → Default layoutRegions:
     { regionId:"face", sourceX:0.0, sourceY:0.0, sourceW:0.25, sourceH:0.3, destY:0.0, destH:0.3 }
     { regionId:"gameplay", sourceX:0.0, sourceY:0.0, sourceW:1.0, sourceH:1.0, destY:0.3, destH:0.7 }

4. "tutorial_pip" — Screen recording with optional face PiP
   Transcription clues: "click here", "navigate to", "open the menu", "as you can see on screen",
   software names (Figma/Excel/VS Code/Photoshop/browser), step-by-step language
   ("first...", "now...", "next step...", "finally...")
   → Default layoutRegions:
     { regionId:"screen", sourceX:0.0, sourceY:0.0, sourceW:1.0, sourceH:1.0, destY:0.0, destH:1.0 }
     { regionId:"face_pip", sourceX:0.0, sourceY:0.7, sourceW:0.2, sourceH:0.3, destY:0.86, destH:0.14 }

5. "standard" — No composite layout needed (default fallback)
   → Use cropStrategy only. Set layoutRegions to [].
   → Also use for educational_visual: pair with cropStrategy blur_sides to preserve
     full frame width with blurred letterbox (no composite regions needed).

LAYOUT DECISION RULES:
- Gaming vocabulary detected → "gameplay_cam" (even if solo monologue)
- Clear two-person dialogue / Q&A → "interview_split"
- Step-by-step screen instructions → "tutorial_pip"
- Single person speaking (no gaming/tutorial clues) → "talking_head"
- Educational visual content (whiteboard/diagrams/CS terms, no software UI) → "standard" with cropStrategy blur_sides
- Uncertain or mixed signals → "standard"

IMPORTANT about layoutRegions:
- All values are fractions 0.0–1.0 (NOT pixels)
- sourceX/Y/W/H = region to crop FROM the source video (fraction of source dimensions)
- destY/destH = where this region sits in the 1080x1920 OUTPUT (fraction of 1920 height)
- Use the DEFAULT values above unless you have strong evidence of a non-standard source layout
- For "standard" and "talking_head", set layoutRegions to []`;
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
4. CROP STRATEGY: For EACH highlight, analyze the scene and select the appropriate crop method with reasoning
5. LAYOUT TYPE: Select the composite layoutType based on content clues (gaming vocab → gameplay_cam, two-person dialogue → interview_split, screen tutorial → tutorial_pip, single person → talking_head, educational visual [whiteboard/diagrams/CS terms, no click instructions] → standard with cropStrategy blur_sides, uncertain → standard). Use default layoutRegions unless evidence suggests otherwise.

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

INSTRUCTIONS FOR CROP STRATEGY SELECTION:
For each highlight, analyze the transcription content to infer the scene composition:

1. Look for clues about NUMBER OF PEOPLE:
   - "I think..." (single person) → track_speaker
   - "We believe..." (multiple people) → blur_sides
   - "Let's discuss..." with back-and-forth dialogue → blur_sides
   - Screen share indicators → wide_shot

2. Look for clues about MOVEMENT:
   - "I'm going to show you how to..." → track_action
   - "Watch as I demonstrate..." → track_action
   - "Here's what I think about..." → track_speaker
   - Descriptive landscape/scenery talk → wide_shot

3. Provide REASONING explaining your choice based on transcription clues

CROP STRATEGY EXAMPLE (demonstration):
Transcription: "So I'm going to show you how to make the perfect espresso. First, you grind the beans..."
→ method: "track_action" (demonstration with hand movements)
→ sceneType: "single_person"
→ subjectPosition: "center"
→ reasoning: "Instructional cooking/barista demonstration with active hand movements showing technique. Track_action will follow the hands and equipment smoothly."

CROP STRATEGY EXAMPLE (educational visual):
Transcription: "Think of a stack like a pile of plates. The last plate you put on is the first one you take off. That's LIFO — last in, first out. A queue is the opposite..."
→ method: "blur_sides"
→ sceneType: "educational_visual"
→ subjectPosition: "center"
→ reasoning: "Conceptual explanation of data structures using analogy ('think of', 'like a pile of'). References stack/queue, LIFO. No software instructions or click-throughs. Visual content spans full frame width — blur_sides preserves all content with letterbox fill."
→ layoutType: "standard" (cropStrategy handles rendering, no composite regions needed)

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
