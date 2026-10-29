/**
 * Captions without a language model.
 *
 * The cloud pipeline asked GPT to group words and pick emphasis, then threw the
 * grouping away: the renderer re-pages words by the preset's `wordsPerPage`
 * (see `flattenCaptionWords`). Whisper's own word timings are therefore all a
 * burn needs, which is what makes captions free here.
 */
import type { CaptionsResult, CaptionSegment } from '@/lib/ai/caption-schema';
import type { WordTimestamp } from '@/lib/ai/transcribe';
import { getCaptionStyle, type CaptionStyleName } from '@/lib/ai/caption-styles';

/** Words of the transcript that fall inside a clip, re-timed to start at zero. */
export function clipWords(words: WordTimestamp[], startTime: number, endTime: number): WordTimestamp[] {
  return words
    .filter((w) => w.end > startTime && w.start < endTime)
    .map((w) => ({
      word: w.word,
      start: Math.max(0, w.start - startTime),
      end: Math.min(endTime - startTime, w.end - startTime),
    }))
    .filter((w) => w.end > w.start);
}

export function buildCaptions(
  words: WordTimestamp[],
  opts: { style: CaptionStyleName; hook?: string; wordsPerSegment?: number }
): CaptionsResult {
  const perSegment = opts.wordsPerSegment ?? 3;
  const preset = getCaptionStyle(opts.style);
  const captions: CaptionSegment[] = [];

  for (let i = 0; i < words.length; i += perSegment) {
    const group = words.slice(i, i + perSegment);
    captions.push({
      startTime: group[0].start,
      endTime: group[group.length - 1].end,
      position: 'bottom',
      words: group.map((w) => ({ word: w.word, startTime: w.start, endTime: w.end, emphasis: false })),
    });
  }

  return {
    captions,
    style: { fontSize: preset.fontSize, color: preset.color, highlightColor: preset.highlightColor },
    hook: opts.hook ?? '',
  };
}
