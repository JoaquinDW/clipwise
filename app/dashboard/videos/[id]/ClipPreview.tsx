"use client"

import { useMemo, useState } from "react"
import { VerticalVideoPlayer } from "@/app/ui/VideoPlayer"
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline"
import TranscriptPanel from "./TranscriptPanel"

interface Clip {
  id: string
  title: string
  description: string | null
  storageUrl: string | null
  score: number
  status: string
  startTime: number
  endTime: number
  duration: number
  metadata: unknown
}

interface Transcription {
  text: string
  language?: string | null
  segments?: unknown[] | null
}

interface ClipPreviewProps {
  clips: Clip[]
  activeClipId: string | null
  transcription: Transcription | null
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export default function ClipPreview({
  clips,
  activeClipId,
  transcription,
}: ClipPreviewProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  const activeClip = useMemo(
    () => clips.find((c) => c.id === activeClipId) ?? null,
    [clips, activeClipId],
  )

  if (!activeClip) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full min-h-96 text-center gap-3"
        style={{ color: "var(--dash-text-secondary)" }}
      >
        <PlayCircleIcon className="w-12 h-12 opacity-30" />
        <p className="text-sm">Select a clip to preview it</p>
      </div>
    )
  }

  const isGenerating = activeClip.status !== "READY" || !activeClip.storageUrl

  return (
    <>
      <div className="sticky top-6 flex flex-col  items-center gap-5 max-w-xs mx-auto">
        {/* 9:16 Player */}
        <div className="w-full">
          {isGenerating ? (
            <div
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{
                aspectRatio: "9/16",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {activeClip.status === "FAILED" ? (
                <p className="text-sm text-red-400 px-4 text-center">
                  Clip generation failed
                </p>
              ) : (
                <>
                  <svg
                    className="animate-spin h-8 w-8"
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
                  <span
                    className="text-sm"
                    style={{ color: "var(--dash-text-secondary)" }}
                  >
                    Generating clip…
                  </span>
                </>
              )}
            </div>
          ) : (
            <VerticalVideoPlayer
              url={activeClip.storageUrl!}
              title={activeClip.title}
              controls
              playing
            />
          )}
        </div>

        {/* Clip info */}
        <div className="w-full text-center space-y-1.5">
          <h3
            className="font-semibold text-sm leading-snug"
            style={{
              fontFamily: "var(--font-syne), sans-serif",
              color: "#f2ede8",
            }}
          >
            {activeClip.title}
          </h3>
          <p className="text-xs" style={{ color: "var(--dash-text-muted)" }}>
            {activeClip.startTime.toFixed(1)}s – {activeClip.endTime.toFixed(1)}
            s · {formatDuration(activeClip.duration)}
          </p>
          <p>
            {activeClip.description ? (
              <span
                className="text-sm"
                style={{ color: "var(--dash-text-secondary)" }}
              >
                {activeClip.description}
              </span>
            ) : (
              <span
                className="text-sm italic"
                style={{ color: "var(--dash-text-secondary)" }}
              >
                No description
              </span>
            )}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {activeClip.storageUrl && (
              <a
                href={activeClip.storageUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Download
              </a>
            )}
            {transcription && (
              <button
                type="button"
                onClick={() => setTranscriptOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "var(--dash-text-secondary)",
                }}
              >
                <DocumentTextIcon className="w-3.5 h-3.5" />
                Transcript
              </button>
            )}
          </div>
        </div>
      </div>

      {transcription && (
        <TranscriptPanel
          isOpen={transcriptOpen}
          onClose={() => setTranscriptOpen(false)}
          transcription={transcription}
        />
      )}
    </>
  )
}
