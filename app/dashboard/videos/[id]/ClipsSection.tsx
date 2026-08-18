"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline"
import ClipPreview from "./ClipPreview"
import ClipModal from "./ClipModal"
import ClipEditor from "./ClipEditor"
import ClipTimeline, { TIMELINE_HEIGHT } from "./ClipTimeline"
import TranscriptPanel from "./TranscriptPanel"
import { useClipDownload } from "./useClipDownload"
import { useClipEditorStore } from "@/lib/store/clip-editor.store"
import { isTrimValid } from "@/lib/video/trim-limits"

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
  const [activeClipId, setActiveClipId] = useState<string | null>(initialClipId)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Downloading never changes which clip is on screen: a render is a deliverable
  // that lands on the user's disk, not a new clip to edit. The card stays the
  // caption-free original so the next edit starts from clean pixels.
  const activeClip = clips.find((c) => c.id === activeClipId) ?? null
  const clipIsReady = activeClip?.status === "READY" && !!activeClip?.storageUrl

  useEffect(() => {
    const url = new URL(window.location.href)
    if (activeClipId) {
      url.searchParams.set("clip", activeClipId)
    } else {
      url.searchParams.delete("clip")
    }
    window.history.pushState({}, "", url.toString())
  }, [activeClipId])

  // Only follow the server's pick when it names one — a refresh that arrives
  // without a ?clip= must not clear what the user is looking at.
  useEffect(() => {
    if (initialClipId) setActiveClipId(initialClipId)
  }, [initialClipId])

  // The editor store belongs to whichever clip is on screen, whether or not the
  // controls panel is mounted.
  const resetEditor = useClipEditorStore((s) => s.reset)
  useEffect(() => {
    if (activeClip) resetEditor(activeClip)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClip?.id])

  const deltaStart = useClipEditorStore((s) => s.deltaStart)
  const deltaEnd = useClipEditorStore((s) => s.deltaEnd)
  const captionStyle = useClipEditorStore((s) => s.captionStyle)
  const captionPosition = useClipEditorStore((s) => s.captionPosition)
  const captionSize = useClipEditorStore((s) => s.captionSize)
  const edits = useMemo(
    () => ({ deltaStart, deltaEnd, captionStyle, captionPosition, captionSize }),
    [deltaStart, deltaEnd, captionStyle, captionPosition, captionSize]
  )

  const { download, phase, error: downloadError } = useClipDownload(activeClip, edits)

  const trimValid = activeClip ? isTrimValid(activeClip, { deltaStart, deltaEnd }) : false
  const busy = phase === "rendering" || phase === "downloading"
  const downloadLabel =
    phase === "rendering"
      ? "Preparing your clip…"
      : phase === "downloading"
        ? "Downloading…"
        : "Download"

  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{
        height: "100%",
        // Single source of truth for the bottom bar's height; ClipPreview
        // subtracts it so the player never ends up behind the timeline.
        ["--clip-timeline-h" as string]: `${TIMELINE_HEIGHT}px`,
      }}
    >
      {/* Row 1 — the three columns */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
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
                initialClipId={activeClip?.id ?? null}
                onClipSelect={setActiveClipId}
              />
            )}
          </div>
        </aside>

        {/* Center — large video player */}
        <main className="flex-1 flex flex-col items-center overflow-y-auto py-4 px-6">
          <ClipPreview
            clips={clips}
            activeClipId={activeClip?.id ?? null}
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
              <ClipEditor />
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
              {clipIsReady && (
                <>
                  <button
                    type="button"
                    onClick={download}
                    disabled={busy || !trimValid}
                    className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg text-white transition-opacity disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {phase === "rendering" ? (
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    )}
                    {downloadLabel}
                  </button>
                  {downloadError && (
                    <p className="text-xs text-red-400 text-center">{downloadError}</p>
                  )}
                  {!trimValid && !downloadError && (
                    <p className="text-xs text-center" style={{ color: "var(--dash-text-muted)" }}>
                      Adjust the trim handles to a valid length first.
                    </p>
                  )}
                </>
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
      </div>

      {/* Row 2 — full-width trim timeline pinned to the bottom edge */}
      {clipIsReady ? (
        <ClipTimeline
          clip={{
            id: activeClip!.id,
            startTime: activeClip!.startTime,
            endTime: activeClip!.endTime,
            proxyUrl: activeClip!.proxyUrl,
            storageUrl: activeClip!.storageUrl,
            thumbnailUrl: activeClip!.thumbnailUrl,
            captions: activeClip!.captions,
          }}
          videoRef={videoRef}
        />
      ) : (
        // Same height either way, so selecting a clip never resizes the player.
        <div
          className="flex-none w-full flex items-center justify-center"
          style={{
            height: TIMELINE_HEIGHT,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "#0e0f11",
          }}
        >
          <p className="text-xs" style={{ color: "var(--dash-text-muted)" }}>
            {activeClip ? "Timeline available once the clip is ready" : "Select a clip to trim it"}
          </p>
        </div>
      )}

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
