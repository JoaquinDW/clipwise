/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile } from 'fs/promises';
import type { TranscriptionSegment, WordTimestamp } from './transcribe';

export interface ChunkTranscriptionResult {
  segments: TranscriptionSegment[];
  words: WordTimestamp[];
  text: string;
  language: string;
}

/**
 * Transcribe a single audio chunk from a local file path,
 * adjusting all timestamps by `offsetSeconds` so they are
 * absolute relative to the full video.
 */
export async function transcribeChunk(
  chunkPath: string,
  offsetSeconds: number,
  language?: string
): Promise<ChunkTranscriptionResult> {
  const buffer = await readFile(chunkPath);
  const blob = new Blob([buffer], { type: 'audio/m4a' });
  const file = new File([blob], 'chunk.m4a', { type: 'audio/m4a' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  formData.append('timestamp_granularities[]', 'word');
  if (language) formData.append('language', language);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Whisper API error on chunk: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();

  const segments: TranscriptionSegment[] = (data.segments ?? []).map((seg: any) => ({
    start: seg.start + offsetSeconds,
    end: seg.end + offsetSeconds,
    text: seg.text.trim(),
  }));

  const words: WordTimestamp[] = (data.words ?? []).map((w: any) => ({
    word: w.word.trim(),
    start: w.start + offsetSeconds,
    end: w.end + offsetSeconds,
  }));

  return { segments, words, text: data.text ?? '', language: data.language ?? '' };
}
