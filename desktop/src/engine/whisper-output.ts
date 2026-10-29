/**
 * Turning whisper.cpp's JSON into the transcript shape the pipeline uses.
 *
 * Pure on purpose: it is the part most likely to break when whisper.cpp changes
 * its output, and the part that can be tested without a 500 MB model.
 */
import type { TranscriptionResult, TranscriptionSegment, WordTimestamp } from '@/lib/ai/transcribe';

/** The subset of `whisper-cli -oj` output we read. */
export interface WhisperJson {
  result?: { language?: string };
  transcription?: Array<{
    offsets?: { from: number; to: number }; // milliseconds
    text?: string;
  }>;
}

/** A sentence ends here: the clip boundaries an agent picks should land on these. */
const SENTENCE_END = /[.!?…。？！]["')\]]*$/;

/** Silence that long reads as a new thought even without punctuation. */
const PAUSE_BREAK_SECONDS = 0.8;

/** A segment longer than this is too coarse for an agent to cut against. */
const MAX_SEGMENT_SECONDS = 12;

/**
 * whisper.cpp with `-ml 1 -sow` emits one entry per word, but punctuation and
 * contraction tails sometimes come through as their own entries (" ,", "'s").
 * Those belong to the word before them.
 */
export function parseWhisperWords(json: WhisperJson): WordTimestamp[] {
  const words: WordTimestamp[] = [];

  for (const entry of json.transcription ?? []) {
    const raw = entry.text ?? '';
    const text = raw.trim();
    if (!text || !entry.offsets) continue;
    // Non-speech markers whisper inserts on music and silence
    if (/^\[.*\]$|^\(.*\)$/.test(text)) continue;

    const start = entry.offsets.from / 1000;
    const end = Math.max(start, entry.offsets.to / 1000);
    const attaches = !/^\s/.test(raw) || /^[\p{P}]+$/u.test(text);

    const previous = words[words.length - 1];
    if (previous && attaches) {
      previous.word += text;
      previous.end = Math.max(previous.end, end);
      continue;
    }

    words.push({ word: text, start, end });
  }

  return words;
}

/** Group words into sentence-sized segments with their own timings. */
export function wordsToSegments(words: WordTimestamp[]): TranscriptionSegment[] {
  const segments: TranscriptionSegment[] = [];
  let current: WordTimestamp[] = [];

  const close = () => {
    if (current.length === 0) return;
    segments.push({
      start: current[0].start,
      end: current[current.length - 1].end,
      text: current.map((w) => w.word).join(' '),
    });
    current = [];
  };

  for (const word of words) {
    const previous = current[current.length - 1];
    if (previous) {
      const pause = word.start - previous.end;
      const length = word.end - current[0].start;
      if (pause >= PAUSE_BREAK_SECONDS || length > MAX_SEGMENT_SECONDS) close();
    }
    current.push(word);
    if (SENTENCE_END.test(word.word)) close();
  }
  close();

  return segments;
}

export function toTranscription(json: WhisperJson, fallbackDuration = 0): TranscriptionResult {
  const words = parseWhisperWords(json);
  const segments = wordsToSegments(words);
  return {
    text: segments.map((s) => s.text).join(' '),
    language: json.result?.language ?? 'auto',
    segments,
    words,
    duration: words.length > 0 ? Math.max(fallbackDuration, words[words.length - 1].end) : fallbackDuration,
  };
}

/** `whisper_print_progress_callback: progress =  42%` → 0.42 */
export function parseWhisperProgress(line: string): number | null {
  const match = line.match(/progress\s*=\s*(\d+)%/);
  return match ? Number(match[1]) / 100 : null;
}
