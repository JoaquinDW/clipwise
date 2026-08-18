'use client'

import ProgressBar from '@/app/ui/progress-bar'
import {
  FALLBACK_STATUS_STYLE,
  STATUS_LABELS,
  STATUS_STYLES,
  isIndeterminate,
  isProcessing,
  stageDescription,
} from '@/lib/video/video-status-ui'
import { useVideoProgress } from './VideoProgress'

type Fallback = { status: string; errorMessage: string | null }

/** Just the badge — it is the one thing that fits in the 40px header on any screen. */
export function VideoStatusBadge({ fallback }: { fallback: Fallback }) {
  const live = useVideoProgress()
  const status = live?.status ?? fallback.status

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-none ${
        STATUS_STYLES[status] ?? FALLBACK_STATUS_STYLE
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

/**
 * The processing strip: bar, live stage text, percentage.
 *
 * A full-width row of its own rather than an item squeezed into the header.
 * The previous inline version was `hidden sm:block`, so on a phone the entire
 * progress narrative disappeared and left a bare spinner — which is where a
 * user is least able to guess what the pipeline is doing.
 */
export function VideoProgressStrip({ fallback }: { fallback: Fallback }) {
  const live = useVideoProgress()
  const status = live?.status ?? fallback.status
  const errorMessage = live?.errorMessage ?? fallback.errorMessage

  if (status === 'FAILED') {
    return errorMessage ? (
      <div
        className="flex-none px-4 py-2 text-xs border-b"
        style={{
          background: 'rgba(239,68,68,0.08)',
          borderColor: 'rgba(239,68,68,0.2)',
          color: '#f87171',
        }}
      >
        {errorMessage}
      </div>
    ) : null
  }

  if (!isProcessing(status)) return null

  const detail = stageDescription(status, live?.stageDetail)
  const progress = live?.progress ?? 0

  return (
    <div
      className="flex-none px-4 py-2 border-b"
      style={{ background: '#0e0f11', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-xs truncate" style={{ color: 'var(--dash-text-secondary)' }}>
          {detail}
        </span>
        <span
          className="text-xs tabular-nums flex-none"
          style={{ color: 'var(--dash-text-muted)' }}
        >
          {progress}%
        </span>
      </div>
      <ProgressBar
        value={progress}
        indeterminate={isIndeterminate(status, live?.stageProgress ?? 0)}
        size="sm"
        label="Video processing progress"
      />
    </div>
  )
}
