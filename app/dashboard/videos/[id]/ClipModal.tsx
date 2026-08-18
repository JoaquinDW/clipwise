/* eslint-disable indent */
"use client"

import { useState, useEffect, useCallback } from "react"
import { PlayIcon } from "@heroicons/react/24/outline"
import ProgressBar from "@/app/ui/progress-bar"
import Spinner from "@/app/ui/spinner"
import { useLiveClip } from "./VideoProgress"

interface Clip {
  id: string
  title: string
  description: string | null
  storageUrl: string | null
  thumbnailUrl?: string | null
  score: number
  status: string
  startTime: number
  endTime: number
  duration: number
  metadata: unknown
  parentClipId?: string | null
}

/** The part of the clip metadata blob the rail reads. */
type ClipMetadata = {
  hookText?: string
  cropStrategy?: { reasoning?: string }
}

interface ClipModalProps {
  clips: Clip[]
  initialClipId: string | null
  onClipSelect?: (clipId: string | null) => void
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? {
          bg: "rgba(34,197,94,0.15)",
          text: "#4ade80",
          border: "rgba(34,197,94,0.3)",
        }
      : score >= 60
        ? {
            bg: "rgba(251,191,36,0.12)",
            text: "#fbbf24",
            border: "rgba(251,191,36,0.3)",
          }
        : {
            bg: "rgba(239,68,68,0.15)",
            text: "#f87171",
            border: "rgba(239,68,68,0.3)",
          }

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold flex-none"
      style={{
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
      }}
    >
      {Math.round(score)}
    </span>
  )
}

export default function ClipModal({
  clips,
  initialClipId,
  onClipSelect,
}: ClipModalProps) {
  const [activeClipId, setActiveClipId] = useState<string | null>(initialClipId)

  useEffect(() => {
    setActiveClipId(initialClipId)
  }, [initialClipId])

  const handleOpen = useCallback(
    (clipId: string) => {
      setActiveClipId(clipId)
      onClipSelect?.(clipId)
    },
    [onClipSelect],
  )

  return (
    <div className="space-y-1.5">
      {clips.map((clip, index) => (
        <ClipCard
          key={clip.id}
          clip={clip}
          index={index}
          isActive={clip.id === activeClipId}
          onOpen={handleOpen}
        />
      ))}
    </div>
  )
}

/**
 * One clip in the rail.
 *
 * The analysis step writes title, description, hook, score and crop reasoning
 * long before the clip has a video file, so a card is genuinely informative
 * from the moment it appears — it does not have to wait for the render to say
 * anything more than "Generating…".
 */
function ClipCard({
  clip,
  index,
  isActive,
  onOpen,
}: {
  clip: Clip
  index: number
  isActive: boolean
  onOpen: (clipId: string) => void
}) {
  // The poller is ahead of the server render between refreshes.
  const live = useLiveClip(clip.id)
  const status = live?.status ?? clip.status
  const thumbnailUrl = live?.thumbnailUrl ?? clip.thumbnailUrl
  const storageUrl = live?.storageUrl ?? clip.storageUrl
  const renderProgress = live?.progress ?? 0

  const isReady = status === "READY" && storageUrl
  const isGenerating = status === "GENERATING"
  const isPending = status === "PENDING"
  const isFailed = status === "FAILED"

  const meta = clip.metadata as ClipMetadata | null
  const hookText = live?.hookText ?? meta?.hookText ?? null
  const cropReason = live?.cropReason ?? meta?.cropStrategy?.reasoning ?? null
  const subtitle = hookText ?? clip.description ?? null

  return (
    <button
      type="button"
      disabled={!isReady}
      onClick={() => isReady && onOpen(clip.id)}
      className={`w-full text-left rounded-xl p-3 flex items-start gap-3 transition-all ${isReady ? "cursor-pointer hover:bg-[rgba(255,255,255,0.05)]" : "cursor-default"}`}
      style={
        isActive
          ? {
              background: "rgba(255,59,92,0.08)",
              borderLeft: "3px solid #FF3B5C",
              paddingLeft: "calc(0.75rem - 3px)",
            }
          : {
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }
      }
    >
      {/* Thumbnail */}
      <div
        className="relative flex-none rounded-lg overflow-hidden bg-[rgba(255,255,255,0.06)]"
        style={{ width: 56, height: 100 }}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            width={56}
            height={100}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : isGenerating ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="h-4 w-4" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayIcon
              className="w-4 h-4 opacity-30"
              style={{ color: "var(--dash-text-secondary)" }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="text-[11px] font-medium px-1 py-0.5 rounded flex-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "var(--dash-text-muted)",
            }}
          >
            #{index + 1}
          </span>
          <ScoreBadge score={clip.score} />
          {clip.parentClipId && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-none"
              style={{
                background: "rgba(99,102,241,0.15)",
                color: "#818cf8",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              Edited
            </span>
          )}
          {isActive && (
            <span
              className="text-[10px] font-medium ml-auto flex-none"
              style={{ color: "#FF3B5C" }}
            >
              ▶ Playing
            </span>
          )}
        </div>

        <p
          className="text-lg font-medium leading-tight truncate"
          style={{
            color: "#f2ede8",
            fontFamily: "var(--font-syne), sans-serif",
          }}
        >
          {clip.title}
        </p>

        {/* Available from analysis, well before the clip has any pixels. */}
        {subtitle && (
          <p
            className="text-[13px] mt-0.5 leading-snug line-clamp-2"
            style={{ color: "var(--dash-text-secondary)" }}
          >
            {subtitle}
          </p>
        )}

        {cropReason && (
          <p
            className="text-[11px] mt-1 leading-snug line-clamp-2"
            style={{ color: "var(--dash-text-muted)" }}
            title={cropReason}
          >
            {cropReason}
          </p>
        )}

        {/* Render state. A PENDING clip used to show only its duration on a
            dead disabled button, which read as broken rather than queued. */}
        <div className="mt-1.5">
          {isGenerating ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[12px]" style={{ color: "var(--dash-text-muted)" }}>
                  Rendering
                </span>
                <span
                  className="text-[12px] tabular-nums"
                  style={{ color: "var(--dash-text-muted)" }}
                >
                  {renderProgress}%
                </span>
              </div>
              <ProgressBar
                value={renderProgress}
                indeterminate={renderProgress <= 0}
                size="sm"
                label={`Rendering ${clip.title}`}
              />
            </>
          ) : (
            <p
              className="text-[14px]"
              style={{ color: isFailed ? "#f87171" : "var(--dash-text-muted)" }}
            >
              {isPending
                ? "Queued"
                : isFailed
                  ? "Render failed"
                  : formatDuration(clip.duration)}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
