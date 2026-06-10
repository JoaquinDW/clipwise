import type { TranscriptionSegment } from './transcribe';

// ── Configuration ─────────────────────────────────────────────────────────────

export const WINDOW_DURATION = 30; // seconds per window
export const WINDOW_STEP = 15; // 50% overlap between windows
export const TOP_K_CANDIDATES = 20; // windows forwarded to GPT
export const EXPANSION_SECONDS = 30; // context padding ±N seconds
export const MIN_HEURISTIC_SCORE = 0.18; // discard bottom ~40% of windows
export const SHORT_VIDEO_BYPASS_SECONDS = 300; // videos < 5min use legacy path

// ── Keyword & Pattern Tables ──────────────────────────────────────────────────

// Values are normalized weights (0.0 – 1.0). Accent-stripped variants included.
const EMOTIONAL_KEYWORDS: Record<string, number> = {
  // Spanish
  'increíble': 1.0, 'increible': 1.0, 'imposible': 0.9, 'locura': 0.9,
  'brutal': 0.85, 'secreto': 0.85, 'error': 0.7, 'nadie': 0.7,
  'jamás': 0.8, 'jamas': 0.8, 'impresionante': 0.9, 'sorprendente': 0.85,
  'bestial': 0.8, 'absurdo': 0.75,
  // English
  'incredible': 1.0, 'impossible': 0.9, 'crazy': 0.9, 'insane': 0.9,
  'secret': 0.85, 'mistake': 0.7, 'nobody': 0.7, 'never': 0.8,
  'shocking': 0.9, 'unbelievable': 1.0, 'mindblowing': 1.0, 'viral': 0.85,
  'surprising': 0.8, 'unexpected': 0.8, 'worst': 0.75, 'best': 0.6,
};

const STRONG_STATEMENT_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  // Spanish
  { pattern: /esto cambi[oó] mi vida/i, weight: 1.0 },
  { pattern: /perd[ií] todo/i, weight: 1.0 },
  { pattern: /gan[eé] millones/i, weight: 1.0 },
  { pattern: /nadie (sabe|lo sabe|esperaba)/i, weight: 0.9 },
  { pattern: /el secreto (es|de|para)/i, weight: 0.9 },
  { pattern: /cambi[oó] todo/i, weight: 0.9 },
  { pattern: /nunca (antes|lo hab[ií]a|pens[eé])/i, weight: 0.85 },
  // English
  { pattern: /changed my life/i, weight: 1.0 },
  { pattern: /lost everything/i, weight: 1.0 },
  { pattern: /made millions/i, weight: 1.0 },
  { pattern: /nobody (knows|told|expected)/i, weight: 0.9 },
  { pattern: /the secret (is|to|of)/i, weight: 0.9 },
  { pattern: /changed everything/i, weight: 0.9 },
  { pattern: /you won't believe/i, weight: 0.85 },
  { pattern: /this will change/i, weight: 0.85 },
  { pattern: /i never thought/i, weight: 0.8 },
];

const PROBLEM_WORDS = /\b(problem|issue|error|fail|broke|lost|bad|terrible|worst|wrong|broken|problema|error|fallo|mal|perd[ií]|roto|terrible|peor)\b/i;
const TENSION_WORDS = /\b(but|however|suddenly|until|almost|nearly|nearly|then|pero|sin embargo|de repente|hasta que|casi|luego)\b/i;
const RESOLUTION_WORDS = /\b(solution|solved|fixed|learned|realized|figured|now|finally|solución|resolv[ií]|aprend[ií]|descubr[ií]|ahora|finalmente)\b/i;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  emotionalKeywords: number;
  strongStatements: number;
  questionAnswer: number;
  storyArc: number;
  speechDensity: number;
}

export interface ScoredWindow {
  startTime: number;
  endTime: number;
  segments: TranscriptionSegment[];
  text: string;
  heuristicScore: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface ExpandedWindow extends ScoredWindow {
  expandedStart: number;
  expandedEnd: number;
}

// ── Individual scoring signals ────────────────────────────────────────────────

export function scoreEmotionalKeywords(text: string): number {
  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/);

  let total = 0;
  for (const word of words) {
    const clean = word.replace(/[^a-záéíóúüñ]/gi, '');
    const weight = EMOTIONAL_KEYWORDS[clean];
    if (weight) total += weight;
  }

  // Cap at 1.0: reaching 3 high-weight keywords saturates the signal
  return Math.min(total / 3, 1.0);
}

export function scoreStrongStatements(text: string): number {
  let best = 0;
  for (const { pattern, weight } of STRONG_STATEMENT_PATTERNS) {
    if (pattern.test(text) && weight > best) best = weight;
  }
  return best;
}

export function scoreQuestionAnswer(
  segments: TranscriptionSegment[],
  windowStart: number,
  windowEnd: number
): number {
  const windowSegments = segments.filter(
    (s) => s.start >= windowStart && s.start < windowEnd
  );

  for (let i = 0; i < windowSegments.length; i++) {
    const seg = windowSegments[i];
    if (!seg.text.includes('?') && !/\b(qué|cómo|cuándo|por qué|quién|cuál|cuánto|what|how|why|when|who|which)\b/i.test(seg.text)) {
      continue;
    }

    // Look for a response segment within the next 10 seconds
    const responseWindow = windowSegments.filter(
      (s) => s.start > seg.end && s.start <= seg.end + 10 && s.text.trim().length > 10
    );

    if (responseWindow.length > 0) return 1.0;
  }

  // Partial credit: has a question but no clear answer found yet
  const hasQuestion = windowSegments.some(
    (s) => s.text.includes('?') || /\b(qué|cómo|cuándo|por qué|what|how|why|when)\b/i.test(s.text)
  );
  return hasQuestion ? 0.4 : 0;
}

export function scoreStoryArc(text: string): number {
  const hasProblem = PROBLEM_WORDS.test(text);
  const hasTension = TENSION_WORDS.test(text);
  const hasResolution = RESOLUTION_WORDS.test(text);

  const count = [hasProblem, hasTension, hasResolution].filter(Boolean).length;
  return count / 3; // 0, 0.33, 0.67, or 1.0
}

export function scoreSpeechDensity(wordCount: number, durationSeconds: number): number {
  const wps = wordCount / Math.max(durationSeconds, 1);
  // Sigmoid tuned so: 2.5 wps → 0.5, 4.0 wps → 0.85, 1.0 wps → 0.18
  return 1 / (1 + Math.exp(-1.8 * (wps - 2.5)));
}

// ── Main scoring pipeline ─────────────────────────────────────────────────────

function buildWindows(
  segments: TranscriptionSegment[],
  windowDuration: number,
  windowStep: number
): Array<{ startTime: number; endTime: number; segments: TranscriptionSegment[]; text: string }> {
  if (segments.length === 0) return [];

  const videoDuration = segments[segments.length - 1].end;
  const windows: Array<{ startTime: number; endTime: number; segments: TranscriptionSegment[]; text: string }> = [];

  for (let start = 0; start < videoDuration; start += windowStep) {
    const end = start + windowDuration;
    const windowSegs = segments.filter((s) => s.start >= start && s.start < end);

    if (windowSegs.length === 0) continue;

    windows.push({
      startTime: start,
      endTime: Math.min(end, videoDuration),
      segments: windowSegs,
      text: windowSegs.map((s) => s.text).join(' '),
    });
  }

  return windows;
}

function deduplicateWindows(windows: ScoredWindow[], minGapSeconds: number): ScoredWindow[] {
  const sorted = [...windows].sort((a, b) => b.heuristicScore - a.heuristicScore);
  const kept: ScoredWindow[] = [];

  for (const candidate of sorted) {
    const tooClose = kept.some(
      (k) => Math.abs(k.startTime - candidate.startTime) < minGapSeconds
    );
    if (!tooClose) kept.push(candidate);
  }

  return kept;
}

export function scoreWindows(
  segments: TranscriptionSegment[],
  options?: {
    windowDuration?: number;
    windowStep?: number;
    topK?: number;
    minScore?: number;
  }
): ScoredWindow[] {
  const windowDuration = options?.windowDuration ?? WINDOW_DURATION;
  const windowStep = options?.windowStep ?? WINDOW_STEP;
  const topK = options?.topK ?? TOP_K_CANDIDATES;
  const minScore = options?.minScore ?? MIN_HEURISTIC_SCORE;

  const rawWindows = buildWindows(segments, windowDuration, windowStep);

  const scored: ScoredWindow[] = rawWindows.map((w) => {
    const wordCount = w.text.split(/\s+/).filter(Boolean).length;
    const duration = w.endTime - w.startTime;

    const emotionalKeywords = scoreEmotionalKeywords(w.text);
    const strongStatements = scoreStrongStatements(w.text);
    const questionAnswer = scoreQuestionAnswer(segments, w.startTime, w.endTime);
    const storyArc = scoreStoryArc(w.text);
    const speechDensity = scoreSpeechDensity(wordCount, duration);

    const heuristicScore =
      0.30 * emotionalKeywords +
      0.25 * strongStatements +
      0.20 * questionAnswer +
      0.15 * storyArc +
      0.10 * speechDensity;

    return {
      ...w,
      heuristicScore,
      scoreBreakdown: { emotionalKeywords, strongStatements, questionAnswer, storyArc, speechDensity },
    };
  });

  // Filter by minimum score, deduplicate, take top K
  const aboveThreshold = scored.filter((w) => w.heuristicScore >= minScore);
  const deduped = deduplicateWindows(aboveThreshold, windowStep / 2);

  return deduped
    .sort((a, b) => b.heuristicScore - a.heuristicScore)
    .slice(0, topK);
}

// ── Context expansion ─────────────────────────────────────────────────────────

export function expandWindow(
  window: ScoredWindow,
  expansionSeconds: number,
  videoDuration: number
): { expandedStart: number; expandedEnd: number } {
  return {
    expandedStart: Math.max(0, window.startTime - expansionSeconds),
    expandedEnd: Math.min(videoDuration, window.endTime + expansionSeconds),
  };
}

export function buildExpandedWindows(
  scoredWindows: ScoredWindow[],
  segments: TranscriptionSegment[],
  expansionSeconds: number = EXPANSION_SECONDS
): ExpandedWindow[] {
  const videoDuration = segments.length > 0 ? segments[segments.length - 1].end : 0;

  return scoredWindows.map((w) => {
    const { expandedStart, expandedEnd } = expandWindow(w, expansionSeconds, videoDuration);

    // Re-collect segments within the expanded window for the text GPT will see
    const expandedSegs = segments.filter(
      (s) => s.start >= expandedStart && s.start < expandedEnd
    );
    const expandedText = expandedSegs.map((s) => s.text).join(' ');

    return {
      ...w,
      expandedStart,
      expandedEnd,
      // Override text with expanded context
      text: expandedText,
    };
  });
}
