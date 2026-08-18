/**
 * How a video's pipeline status is presented, in one place.
 *
 * There used to be three copies of this map — the grid, the detail page and the
 * overview — and they had already drifted: the same status read "Extracting" in
 * one and "Extracting audio" in another, and none of them knew about SCORING or
 * RANKING, so long videos silently fell through to a bare "Processing…".
 */

export const TERMINAL_STATUSES = new Set(['READY', 'FAILED'])

export function isProcessing(status: string): boolean {
  return !TERMINAL_STATUSES.has(status)
}

/** Short badge text. */
export const STATUS_LABELS: Record<string, string> = {
  UPLOADING: 'Uploading',
  UPLOADED: 'Queued',
  INGESTING: 'Downloading',
  INGESTED: 'Audio ready',
  TRANSCRIBING: 'Transcribing',
  TRANSCRIBED: 'Analyzing',
  SCORING: 'Analyzing',
  RANKING: 'Analyzing',
  PROCESSING: 'Rendering',
  READY: 'Ready',
  FAILED: 'Failed',
}

export const STATUS_STYLES: Record<string, string> = {
  UPLOADING: 'bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50',
  UPLOADED: 'bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50',
  INGESTING: 'bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50',
  INGESTED: 'bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50',
  TRANSCRIBING: 'bg-[rgba(168,85,247,0.15)] text-purple-400 border border-purple-900/50',
  TRANSCRIBED: 'bg-[rgba(168,85,247,0.15)] text-purple-400 border border-purple-900/50',
  SCORING: 'bg-[rgba(168,85,247,0.15)] text-purple-400 border border-purple-900/50',
  RANKING: 'bg-[rgba(168,85,247,0.15)] text-purple-400 border border-purple-900/50',
  PROCESSING: 'bg-[rgba(251,191,36,0.12)] text-yellow-400 border border-yellow-900/50',
  READY: 'bg-[rgba(34,197,94,0.15)] text-green-400 border border-green-900/50',
  FAILED: 'bg-[rgba(239,68,68,0.15)] text-red-400 border border-red-900/50',
}

export const FALLBACK_STATUS_STYLE =
  'bg-[rgba(255,255,255,0.08)] text-[var(--dash-text-secondary)] border border-[rgba(255,255,255,0.08)]'

/**
 * Full-sentence description of what the pipeline is doing.
 *
 * Only used when the worker has not written a `stageDetail` — a live detail
 * ("Downloading audio — 2.1MB/s · ETA 00:35") always wins, because it says
 * something this map cannot know.
 */
export const STAGE_DESCRIPTIONS: Record<string, string> = {
  UPLOADING: 'Waiting to start…',
  UPLOADED: 'Queued for processing…',
  INGESTING: 'Downloading your video…',
  INGESTED: 'Audio ready, starting transcription…',
  TRANSCRIBING: 'Transcribing audio…',
  TRANSCRIBED: 'Looking for the best moments…',
  SCORING: 'Scanning the transcript for strong moments…',
  RANKING: 'Ranking the best moments with AI…',
  PROCESSING: 'Rendering your clips…',
  READY: 'Done',
  FAILED: 'Failed',
}

export function stageDescription(status: string, stageDetail?: string | null): string {
  return stageDetail || STAGE_DESCRIPTIONS[status] || 'Processing…'
}

/**
 * A stage with no sub-progress of its own — a single Whisper or GPT call —
 * should sweep rather than sit at a number the user reads as frozen.
 */
export function isIndeterminate(status: string, stageProgress: number): boolean {
  return isProcessing(status) && stageProgress <= 0
}
