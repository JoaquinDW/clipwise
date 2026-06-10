"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline"
import ClipPreview from "./ClipPreview"
import ClipModal from "./ClipModal"
import ClipEditor from "./ClipEditor"
import TranscriptPanel from "./TranscriptPanel"

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
  captions: import("@/lib/ai/captions").CaptionsResult | null
  proxyUrl: string | null
  captionStyle: string | null
  captionPosition: "top" | "center" | "bottom" | null
  captionSize: "small" | "medium" | "large" | null
}

interface Transcription {
  text: string
  language?: string | null
  segments?: unknown[] | null
}

interface ClipsSectionProps {
  clips: Clip[]
  initialClipId: string | null
  videoClipsCount: number
  videoStatus: string
  transcription: Transcription | null
}

export default function ClipsSection({
  clips,
  initialClipId,
  videoClipsCount,
  videoStatus,
  transcription,
}: ClipsSectionProps) {
  const router = useRouter()
  const [activeClipId, setActiveClipId] = useState<string | null>(initialClipId)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    if (activeClipId) {
      url.searchParams.set("clip", activeClipId)
    } else {
      url.searchParams.delete("clip")
    }
    window.history.pushState({}, "", url.toString())
  }, [activeClipId])

  useEffect(() => {
    setActiveClipId(initialClipId)
  }, [initialClipId])

  const activeClip = clips.find((c) => c.id === activeClipId) ?? null
  const clipIsReady = activeClip?.status === "READY" && !!activeClip?.storageUrl

  function handleExportStart(newClipId: string) {
    console.log(`[editor] Re-export queued, new clip: ${newClipId}`)
    router.refresh()
  }

  return (
    <div className="flex w-full overflow-hidden" style={{ height: "100%" }}>
      {/* Left column — clips list */}
      <aside
        className="flex-none overflow-y-auto flex flex-col"
        style={{
          width: 440,
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="flex-none px-4 pt-5 pb-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--dash-text-muted)" }}
          >
            Clips{" "}
            <span style={{ color: "var(--dash-text-muted)", fontWeight: 400 }}>
              ({videoClipsCount})
            </span>
          </h2>
        </div>

        <div className="px-3 pb-3 flex-1">
          {videoClipsCount === 0 ? (
            <div
              className="text-center py-12 text-sm px-2"
              style={{ color: "var(--dash-text-secondary)" }}
            >
              {videoStatus === "READY"
                ? "No clips generated"
                : "Clips are being generated…"}
            </div>
          ) : (
            <ClipModal
              clips={clips}
              initialClipId={activeClipId}
              onClipSelect={setActiveClipId}
            />
          )}
        </div>
      </aside>

      {/* Center — large video player */}
      <main className="flex-1 flex flex-col items-center overflow-y-auto py-4 px-6">
        <ClipPreview
          clips={clips}
          activeClipId={activeClipId}
          videoRef={videoRef}
        />
      </main>

      {/* Right column — editor controls */}
      <aside
        className="flex-none flex pt-5 flex-col"
        style={{
          width: 320,
          borderLeft: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Sticky label */}
        <div
          className="flex-none px-4 pt-5 pb-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--dash-text-muted)" }}
          >
            Edit Clip
          </h2>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {clipIsReady ? (
            <ClipEditor
              clip={{
                id: activeClip!.id,
                title: activeClip!.title,
                storageUrl: activeClip!.storageUrl!,
                startTime: activeClip!.startTime,
                endTime: activeClip!.endTime,
                duration: activeClip!.duration,
                captions: activeClip!.captions,
                proxyUrl: activeClip!.proxyUrl,
                captionStyle: activeClip!.captionStyle,
                captionPosition: activeClip!.captionPosition,
                captionSize: activeClip!.captionSize,
              }}
              videoRef={videoRef}
              onExportStart={handleExportStart}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16 text-center gap-3"
              style={{ color: "var(--dash-text-muted)" }}
            >
              <PlayCircleIcon className="w-8 h-8 opacity-30" />
              <p className="text-xs">
                {activeClip
                  ? activeClip.status === "FAILED"
                    ? "Clip generation failed"
                    : "Generating clip…"
                  : "Select a clip to edit"}
              </p>
            </div>
          )}
        </div>

        {/* Download & Transcript */}
        {activeClip && (
          <div
            className="flex-none px-4 py-3 flex flex-col gap-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {activeClip.storageUrl && (
              <a
                href={activeClip.storageUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg text-white transition-colors"
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
                className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors"
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
        )}
      </aside>

      {transcription && (
        <TranscriptPanel
          isOpen={transcriptOpen}
          onClose={() => setTranscriptOpen(false)}
          transcription={transcription}
        />
      )}
    </div>
  )
}
