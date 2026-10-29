import { describe, expect, it } from 'vitest';
import { parseWhisperProgress, parseWhisperWords, toTranscription, wordsToSegments } from '../src/engine/whisper-output';

const entry = (from: number, to: number, text: string) => ({ offsets: { from, to }, text });

describe('parseWhisperWords', () => {
  it('reads one word per entry, in seconds', () => {
    const words = parseWhisperWords({ transcription: [entry(0, 400, ' Hola'), entry(450, 900, ' mundo')] });
    expect(words).toEqual([
      { word: 'Hola', start: 0, end: 0.4 },
      { word: 'mundo', start: 0.45, end: 0.9 },
    ]);
  });

  it('glues punctuation and unspaced tails onto the previous word', () => {
    const words = parseWhisperWords({
      transcription: [entry(0, 300, ' it'), entry(300, 350, "'s"), entry(350, 500, ' over'), entry(500, 520, '.')],
    });
    expect(words.map((w) => w.word)).toEqual(["it's", 'over.']);
    expect(words[1].end).toBe(0.52);
  });

  it('drops non-speech markers and empty entries', () => {
    const words = parseWhisperWords({ transcription: [entry(0, 1000, ' [Music]'), entry(1000, 1100, ' '), entry(1100, 1400, ' yes')] });
    expect(words.map((w) => w.word)).toEqual(['yes']);
  });
});

describe('wordsToSegments', () => {
  it('breaks at sentence ends and long pauses', () => {
    const segments = wordsToSegments([
      { word: 'One', start: 0, end: 0.3 },
      { word: 'two.', start: 0.3, end: 0.6 },
      { word: 'Three', start: 0.7, end: 1 },
      { word: 'four', start: 3, end: 3.3 },
    ]);
    expect(segments.map((s) => s.text)).toEqual(['One two.', 'Three', 'four']);
    expect(segments[0]).toMatchObject({ start: 0, end: 0.6 });
  });

  it('never lets a segment run past 12 seconds', () => {
    const words = Array.from({ length: 60 }, (_, i) => ({ word: 'w', start: i * 0.5, end: i * 0.5 + 0.4 }));
    for (const seg of wordsToSegments(words)) expect(seg.end - seg.start).toBeLessThanOrEqual(12.5);
  });
});

describe('toTranscription', () => {
  it('carries the detected language and the duration of the speech', () => {
    const result = toTranscription({ result: { language: 'es' }, transcription: [entry(0, 500, ' Hola.')] }, 0);
    expect(result).toMatchObject({ language: 'es', text: 'Hola.', duration: 0.5 });
  });
});

describe('parseWhisperProgress', () => {
  it('reads the progress callback line', () => {
    expect(parseWhisperProgress('whisper_print_progress_callback: progress =  42%')).toBe(0.42);
    expect(parseWhisperProgress('whisper_init_from_file')).toBeNull();
  });
});
