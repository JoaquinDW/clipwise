/**
 * Video Transcription using OpenAI Whisper
 *
 * This module handles video transcription with timestamps using OpenAI Whisper v3.
 * It returns both the full text and segmented transcription with precise timing.
 */

import { checkAIConfiguration } from './providers';

export interface TranscriptionSegment {
  start: number; // Start time in seconds
  end: number; // End time in seconds
  text: string; // Transcribed text for this segment
}

export interface WordTimestamp {
  word: string; // Individual word
  start: number; // Word start time in seconds
  end: number; // Word end time in seconds
}

export interface TranscriptionResult {
  text: string; // Full transcription text
  language: string; // Detected language
  segments: TranscriptionSegment[]; // Timestamped segments
  words: WordTimestamp[]; // Word-level timestamps for precise caption synchronization
  duration: number; // Total duration in seconds
}

/**
 * Transcribe a video file using OpenAI Whisper API
 *
 * @param videoPath - Path or URL to the video file
 * @param options - Optional configuration
 * @returns Transcription with segments and timestamps
 */
export async function transcribeVideo(
  videoPath: string,
  options?: {
    language?: string; // Force specific language (e.g., 'en', 'es')
    prompt?: string; // Optional prompt to guide transcription
  }
): Promise<TranscriptionResult> {
  checkAIConfiguration();

  // TODO: Implement OpenAI Whisper API call
  // For now, this is a placeholder structure

  const formData = new FormData();

  // If videoPath is a URL, fetch the file first
  const videoBlob = await fetchVideoFile(videoPath);

  // Create a File object with proper filename and type for Whisper API
  const file = new File([videoBlob], 'video.mp4', { type: 'video/mp4' });
  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json'); // Get timestamps
  // OpenAI API expects array fields to be sent as separate form fields
  formData.append('timestamp_granularities[]', 'segment');
  formData.append('timestamp_granularities[]', 'word');

  if (options?.language) {
    formData.append('language', options.language);
  }

  if (options?.prompt) {
    formData.append('prompt', options.prompt);
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Whisper API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();

  // Debug logging for word-level timestamps
  console.log('📊 Whisper API Response Summary:');
  console.log(`  - Language detected: ${data.language}`);
  console.log(`  - Duration: ${data.duration}s`);
  console.log(`  - Segments: ${data.segments?.length || 0}`);
  console.log(`  - Words in response: ${data.words?.length || 0}`);

  if (!data.words || data.words.length === 0) {
    console.warn('⚠️ WARNING: Whisper API did not return word-level timestamps!');
    console.warn('   This may cause caption generation to fail.');
    console.warn('   Response keys:', Object.keys(data));
  }

  // Transform Whisper response to our format
  const segments: TranscriptionSegment[] = data.segments?.map((seg: any) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  })) || [];

  const words: WordTimestamp[] = data.words?.map((word: any) => ({
    word: word.word.trim(),
    start: word.start,
    end: word.end,
  })) || [];

  console.log(`✅ Processed ${words.length} words with timestamps`);

  return {
    text: data.text,
    language: data.language,
    segments,
    words,
    duration: data.duration || 0,
  };
}

/**
 * Helper function to fetch video file from URL or path
 */
async function fetchVideoFile(videoPath: string): Promise<Blob> {
  if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    // If it's a Supabase URL, add authorization header
    const isSupabase = videoPath.includes('supabase.co');

    const headers: HeadersInit = {};
    if (isSupabase && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      headers['Authorization'] = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
    }

    const response = await fetch(videoPath, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch video from ${videoPath} (status: ${response.status})`);
    }
    return await response.blob();
  }

  // For local files, we'll need to read from filesystem
  // This will be handled differently based on environment (Node.js vs Edge)
  throw new Error('Local file transcription not yet implemented');
}

/**
 * Extract just the text from a transcription (for AI analysis)
 */
export function getTranscriptionText(segments: TranscriptionSegment[]): string {
  return segments.map(seg => seg.text).join(' ');
}

/**
 * Format transcription with timestamps for display
 */
export function formatTranscriptionWithTimestamps(
  segments: TranscriptionSegment[]
): string {
  return segments
    .map(seg => {
      const startTime = formatTimestamp(seg.start);
      const endTime = formatTimestamp(seg.end);
      return `[${startTime} -> ${endTime}] ${seg.text}`;
    })
    .join('\n');
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
