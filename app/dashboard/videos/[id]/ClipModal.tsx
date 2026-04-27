"use client"

import { useState, useEffect, useCallback } from "react"
import { PlayIcon } from "@heroicons/react/24/outline"
import Image from "next/image"

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
      {clips.map((clip, index) => {
        const isReady = clip.status === "READY" && clip.storageUrl
        const isGenerating = clip.status === "GENERATING"
        const isActive = clip.id === activeClipId

        return (
          <button
            key={clip.id}
            type="button"
            disabled={!isReady}
            onClick={() => isReady && handleOpen(clip.id)}
            className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all ${isReady ? "cursor-pointer hover:bg-[rgba(255,255,255,0.05)]" : "cursor-default"}`}
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
              style={{ width: 40, height: 72 }}
            >
              {clip.thumbnailUrl ? (
                <Image
                  src={clip.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : isGenerating ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    style={{ color: "#FF3B5C" }}
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
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
              <p
                className="text-[14px] mt-1"
                style={{ color: "var(--dash-text-muted)" }}
              >
                {isGenerating ? "Generating…" : formatDuration(clip.duration)}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
