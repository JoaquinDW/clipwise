"use client"

import { useState, useEffect } from "react"
import ClipPreview from "./ClipPreview"
import ClipModal from "./ClipModal"

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

  return (
    <div className="flex w-full overflow-hidden" style={{ height: "100%" }}>
      {/* Left column — scrollable clips list */}
      <aside
        className="flex-none overflow-y-auto flex flex-col"
        style={{
          // should be 40% of the screen but max 400px to avoid too wide empty space on large screens
          width: "min(40%, 600px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="px-4 pt-5 pb-3 flex-none">
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

        <div className="px-3 pb-6 flex-1">
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

      {/* Right column — scrollable, player is sticky inside */}
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <ClipPreview
          clips={clips}
          activeClipId={activeClipId}
          transcription={transcription}
        />
      </main>
    </div>
  )
}
