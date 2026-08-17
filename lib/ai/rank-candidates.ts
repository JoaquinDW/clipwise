import { generateObject } from 'ai';
import { z } from 'zod';
import { defaultModels, checkAIConfiguration } from './providers';
import { CropStrategySchema, LayoutTypeSchema, LayoutRegionSchema } from './highlights';
import type { Highlight } from './highlights';
import type { ExpandedWindow } from './scoring';

// ── Output schema (same fields as Highlight, plus candidateIndex) ─────────────

const RankedCandidateSchema = z.object({
  candidateIndex: z.number().int().min(1).describe('1-based index from the candidate list'),
  title: z.string().describe('Catchy title for this clip (max 100 chars)'),
  description: z.string().describe('Brief description of why this moment is viral'),
  startTime: z.number().describe('Refined start time in SECONDS, absolute from the start of the video (e.g. 2010.0, not 33:30). Must be within the candidate window.'),
  endTime: z.number().describe('Refined end time in SECONDS, absolute from the start of the video (e.g. 2040.0, not 34:00). Must be within the candidate window.'),
  hookText: z.string().describe('The hook or key phrase that makes this viral'),
  score: z.number().min(0).max(100).describe('Virality score 0-100'),
  tags: z.array(z.string()).describe('Relevant tags (funny, emotional, educational, etc.)'),
  cropStrategy: CropStrategySchema,
  layoutType: LayoutTypeSchema,
  layoutRegions: z.array(LayoutRegionSchema).describe('Only for interview_split, gameplay_cam, tutorial_pip. Empty array otherwise.'),
});

const RankingResultSchema = z.object({
  rankedClips: z.array(RankedCandidateSchema).describe('Top clips ordered by virality score (highest first)'),
});

export type RankedCandidate = z.infer<typeof RankedCandidateSchema>;
export type RankingResult = z.infer<typeof RankingResultSchema>;

// ── Main ranking function ─────────────────────────────────────────────────────

export async function rankCandidates(
  candidates: ExpandedWindow[],
  options?: {
    maxClips?: number;
    minDuration?: number;
    maxDuration?: number;
    targetAudience?: string;
    contentType?: string;
  }
): Promise<RankingResult> {
  checkAIConfiguration();

  const {
    maxClips = 5,
    minDuration = 15,
    maxDuration = 60,
    targetAudience = 'social media users on TikTok, Instagram Reels, and YouTube Shorts',
    contentType = 'video content',
  } = options ?? {};

  const systemPrompt = buildSystemPrompt(targetAudience, contentType, minDuration, maxDuration);
  const userPrompt = buildUserPrompt(candidates, maxClips, minDuration, maxDuration);

  const result = await generateObject({
    model: defaultModels.highlightDetection,
    schema: RankingResultSchema,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
  });

  console.log(`📊 GPT ranked ${result.object.rankedClips.length} candidates`);
  result.object.rankedClips.forEach((rc, i) => {
    console.log(`  ${i + 1}. [Candidate ${rc.candidateIndex}] "${rc.title}" — ${rc.startTime.toFixed(1)}s–${rc.endTime.toFixed(1)}s (score: ${rc.score})`);
  });

  const validated = repairRankedClips(result.object.rankedClips, candidates, {
    minDuration,
    maxDuration,
    maxClips,
  });

  console.log(`✅ ${validated.length} clips passed validation`);
  return { rankedClips: validated };
}

/**
 * Validate the model's timestamps, falling back to the candidate's own window
 * where they are unusable instead of dropping the clip.
 *
 * GPT's refinement of the boundaries is a bonus; its *ranking* is what we
 * actually asked for. Dropping a clip on every bad timestamp is how one
 * systematic mistake — such as answering in minutes — turns into zero clips for
 * an entire video.
 *
 * Exported so the repair can be tested without spending a model call.
 */
export function repairRankedClips(
  rankedClips: RankedCandidate[],
  candidates: ExpandedWindow[],
  options: { minDuration: number; maxDuration: number; maxClips: number }
): RankedCandidate[] {
  const { minDuration, maxDuration, maxClips } = options;
  let repaired = 0;

  const validated = rankedClips
    .map((rc): RankedCandidate | null => {
      const candidate = candidates[rc.candidateIndex - 1];
      if (!candidate) {
        // The only irreparable case — there is no window to fall back to
        console.warn(`⚠️ Dropping ranked clip with out-of-range candidateIndex ${rc.candidateIndex}`);
        return null;
      }

      const duration = rc.endTime - rc.startTime;
      const badDuration = duration < minDuration || duration > maxDuration;
      const outsideWindow =
        rc.startTime < candidate.expandedStart - 1 || rc.endTime > candidate.expandedEnd + 1;

      if (!badDuration && !outsideWindow) return rc;

      // The heuristic window is within [minDuration, maxDuration] by
      // construction, so it is always a valid substitute
      const why = badDuration
        ? `duration ${duration.toFixed(1)}s out of [${minDuration}, ${maxDuration}]`
        : 'timestamps outside expanded window';
      console.warn(
        `🔧 Repairing clip "${rc.title}" — ${why}; using candidate window ` +
          `${candidate.startTime.toFixed(1)}s–${candidate.endTime.toFixed(1)}s`
      );
      repaired++;
      return { ...rc, startTime: candidate.startTime, endTime: candidate.endTime };
    })
    .filter((rc): rc is RankedCandidate => rc !== null)
    .slice(0, maxClips);

  if (repaired > 0) {
    // A handful is normal; most of them means the prompt has drifted again
    console.warn(`⚠️ ${repaired}/${rankedClips.length} clips needed timestamp repair`);
  }

  return validated;
}

// ── Converter to Highlight (for downstream Clip record creation) ──────────────

export function rankedCandidateToHighlight(rc: RankedCandidate): Highlight {
  return {
    title: rc.title,
    description: rc.description,
    startTime: rc.startTime,
    endTime: rc.endTime,
    hookText: rc.hookText,
    score: rc.score,
    tags: rc.tags,
    cropStrategy: rc.cropStrategy,
    layoutType: rc.layoutType,
    layoutRegions: rc.layoutRegions,
  };
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function buildSystemPrompt(
  targetAudience: string,
  contentType: string,
  minDuration: number,
  maxDuration: number
): string {
  return `You are an expert viral video editor specializing in short-form content for ${targetAudience}.

You have been given a list of PRE-SELECTED candidate moments from a ${contentType}. These candidates were identified by a heuristic scoring engine as the most promising segments.

Your job is NOT to find new moments — the candidates are already selected. Your tasks are:
1. SCORE each candidate for virality potential (0-100)
2. REFINE the start/end timestamps to natural sentence boundaries within the candidate's window
3. RETURN the top clips ordered by score (highest first)
4. ASSIGN the correct crop strategy and layout type for each clip

⚠️ CRITICAL TIMESTAMP RULES:
- startTime and endTime MUST fall within the candidate's provided time window
- Each clip MUST be ${minDuration}–${maxDuration} seconds long
- Start at the BEGINNING of a sentence; end at the END of a complete sentence
- NEVER cut off mid-sentence

SCORING CRITERIA (0-100):
- Hook strength (0-30 pts): Does it open with something attention-grabbing?
- Emotional resonance (0-25 pts): Humor, surprise, inspiration, controversy?
- Clarity & self-containment (0-20 pts): Makes sense without additional context?
- Entertainment/educational value (0-15 pts)
- Quotability (0-10 pts): Contains a memorable phrase?

═══════════════════════════════════════════════════════════════
🎬 CROP STRATEGY SELECTION
═══════════════════════════════════════════════════════════════

For EACH clip, select the best crop strategy and layout type:

CROP METHODS:
- "track_speaker": Single person talking head (podcast, interview, testimonial)
- "track_action": Person demonstrating/moving (cooking, workout, product review)
- "wide_shot": No clear subject (landscape, screen recording, screencast with clicks)
- "blur_sides": Multiple people OR educational visual (whiteboard, diagrams, CS concepts)

LAYOUT TYPES:
- "talking_head": Single person, standard vertical
- "interview_split": Clear two-person dialogue with Q&A turn-taking
- "gameplay_cam": Gaming stream (gaming terms + reactions + stream chat clues)
- "tutorial_pip": Screen recording with step-by-step click instructions
- "standard": Fallback for everything else (pairs with cropStrategy for rendering)

DECISION LOGIC:
- Gaming vocabulary (kill/clutch/ranked/stream/chat) → "gameplay_cam"
- Clear two-person Q&A dialogue → "interview_split"
- Software clicks + step-by-step ("click here", "navigate to") → "tutorial_pip"
- Single person speaking → "talking_head"
- Educational visual (whiteboard/diagrams/CS terms, NO software click instructions) → "standard" + cropStrategy "blur_sides"
- Uncertain → "standard"

ALWAYS provide reasoning for your crop strategy choice.`;
}

function buildUserPrompt(
  candidates: ExpandedWindow[],
  maxClips: number,
  minDuration: number,
  maxDuration: number
): string {
  // Seconds are the primary number and M:SS is only a readable annotation: given
  // a bare "33:30" window the model answers 33.5, reading the clock as decimal
  // minutes, and every clip is then rejected for being ~1.4 "seconds" long.
  const candidateList = candidates
    .map(
      (c, i) => `Candidate ${i + 1} [${c.expandedStart.toFixed(1)}s–${c.expandedEnd.toFixed(1)}s] (clock: ${formatTime(c.expandedStart)}–${formatTime(c.expandedEnd)}) (heuristic score: ${(c.heuristicScore * 100).toFixed(0)}/100)
${c.text.trim()}`
    )
    .join('\n\n---\n\n');

  return `Rank these ${candidates.length} pre-selected video candidates and return the top ${maxClips} as clips.

⚠️ TIME FORMAT — read carefully:
- ALL times are in SECONDS, absolute from the start of the video.
- Candidate windows are given in seconds, e.g. [2010.0s–2094.0s]. The "clock:" value
  in parentheses is only for readability — never answer in M:SS or in minutes.
- ✓ CORRECT: startTime=2010.0, endTime=2040.0 (a 30 second clip)
- ✗ WRONG: startTime=33.5, endTime=34.9 (that is the clock read as minutes)

⚠️ Requirements:
- Each clip must be ${minDuration}–${maxDuration} seconds, i.e. endTime - startTime is between ${minDuration} and ${maxDuration}
- startTime and endTime must be within each candidate's time window
- Complete sentences only — never cut mid-sentence
- Order by virality score (highest first)

${candidateList}`;
}
