"use client"

import React, { useEffect, useState } from "react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { getCaptionCSSStyle } from "@/lib/ai/caption-styles"
import type { CaptionsResult, CaptionSegment } from "@/lib/ai/captions"
import { useClipEditorStore } from "@/lib/store/clip-editor.store"
import { isTrimValid } from "@/lib/video/trim-limits"

interface Clip {
  id: string
  title: string
  storageUrl: string
  startTime: number
  endTime: number
  duration: number
  captions: CaptionsResult | null
  proxyUrl: string | null
  captionStyle: string | null
  captionPosition: "top" | "center" | "bottom" | null
  captionSize: "small" | "medium" | "large" | null
}

interface ClipEditorProps {
  clip: Clip
  onExportStart: (newClipId: string) => void
}

const STYLE_OPTIONS: { key: string; label: string }[] = [
  { key: "classic", label: "Classic" },
  { key: "bold", label: "Bold" },
  { key: "minimal", label: "Minimal" },
  { key: "viral", label: "Viral" },
  { key: "podcast", label: "Podcast" },
]

const POSITION_OPTIONS: { key: "top" | "center" | "bottom"; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "center", label: "Center" },
  { key: "bottom", label: "Bottom" },
]

const SIZE_OPTIONS: { key: "small" | "medium" | "large"; label: string }[] = [
  { key: "small", label: "S" },
  { key: "medium", label: "M" },
  { key: "large", label: "L" },
]

// ── Caption overlay (exported for use in EditableVideoPlayer) ─────────────────

export function CaptionOverlay({
  captions,
  currentTime,
  captionStyle,
  captionPosition,
  captionSize,
}: {
  captions: CaptionsResult | null
  currentTime: number
  captionStyle: string
  captionPosition: "top" | "center" | "bottom"
  captionSize: "small" | "medium" | "large"
}) {
  if (!captions) return null

  const activeSegment: CaptionSegment | null =
    captions.captions.find(
      (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
    ) ?? null

  if (!activeSegment) return null

  const activeWordIndex = activeSegment.words.findIndex(
    (w) => currentTime >= w.startTime && currentTime <= w.endTime
  )

  const cssStyle = getCaptionCSSStyle(captionStyle, { captionPosition, captionSize })

  return (
    <div style={cssStyle.container}>
      <div>
        {activeSegment.words.map((word, i) => (
          <span key={i} style={i === activeWordIndex ? cssStyle.highlight : cssStyle.word}>
            {word.word}{" "}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Safe area overlay (exported for use in EditableVideoPlayer) ───────────────

export function SafeAreaOverlay({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "8%",
          background: "rgba(255,59,92,0.18)",
          pointerEvents: "none",
        }}
      >
        <span style={{ fontSize: 9, color: "rgba(255,120,140,0.9)", padding: "3px 6px", display: "block" }}>
          Header zone
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "15%",
          background: "rgba(255,59,92,0.18)",
          pointerEvents: "none",
        }}
      >
        <span style={{ fontSize: 9, color: "rgba(255,120,140,0.9)", padding: "3px 6px", display: "block", position: "absolute", bottom: 3, left: 0 }}>
          Nav / CTA zone
        </span>
      </div>
    </>
  )
}

// ── Main editor (controls only) ──────────────────────────────────────────────

export default function ClipEditor({ clip, onExportStart }: ClipEditorProps) {
  const store = useClipEditorStore()

  // Reset store when clip changes
  useEffect(() => {
    store.reset(clip)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.id])

  const { deltaStart, deltaEnd, captionStyle, captionPosition, captionSize, showSafeAreas } = store

  const timingChanged = deltaStart !== 0 || deltaEnd !== 0
  const captionChanged =
    captionStyle !== (clip.captionStyle ?? "classic") ||
    captionPosition !== (clip.captionPosition ?? "bottom") ||
    captionSize !== (clip.captionSize ?? "medium")

  // Trimming itself lives in the timeline bar; this only gates the export.
  const valid = isTrimValid(clip, { deltaStart, deltaEnd })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReexport() {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/clips/${clip.id}/reexport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deltaStart, deltaEnd, captionStyle, captionPosition, captionSize }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Re-export failed")
      onExportStart(data.clipId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-export failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Caption style */}
      <div className="flex flex-col gap-2">
        <span className="text-xs" style={{ color: "var(--dash-text-muted)" }}>Caption Style</span>
        <div className="flex gap-1.5 flex-wrap">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => store.setCaptionStyle(opt.key)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
              style={{
                background: captionStyle === opt.key ? "rgba(255,59,92,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${captionStyle === opt.key ? "rgba(255,59,92,0.4)" : "rgba(255,255,255,0.10)"}`,
                color: captionStyle === opt.key ? "#FF3B5C" : "var(--dash-text-secondary)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Caption position */}
      <div className="flex flex-col gap-2">
        <span className="text-xs" style={{ color: "var(--dash-text-muted)" }}>Position</span>
        <div className="flex gap-1.5">
          {POSITION_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => store.setCaptionPosition(opt.key)}
              className="flex-1 py-1 text-xs font-medium rounded-lg transition-colors"
              style={{
                background: captionPosition === opt.key ? "rgba(255,59,92,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${captionPosition === opt.key ? "rgba(255,59,92,0.4)" : "rgba(255,255,255,0.10)"}`,
                color: captionPosition === opt.key ? "#FF3B5C" : "var(--dash-text-secondary)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Caption size */}
      <div className="flex flex-col gap-2">
        <span className="text-xs" style={{ color: "var(--dash-text-muted)" }}>Size</span>
        <div className="flex gap-1.5">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => store.setCaptionSize(opt.key)}
              className="flex-1 py-1 text-xs font-medium rounded-lg transition-colors"
              style={{
                background: captionSize === opt.key ? "rgba(255,59,92,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${captionSize === opt.key ? "rgba(255,59,92,0.4)" : "rgba(255,255,255,0.10)"}`,
                color: captionSize === opt.key ? "#FF3B5C" : "var(--dash-text-secondary)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Safe areas toggle */}
      <button
        type="button"
        onClick={() => store.setShowSafeAreas(!showSafeAreas)}
        className="flex items-center gap-1.5 text-xs"
        style={{ color: showSafeAreas ? "#FF3B5C" : "var(--dash-text-muted)" }}
      >
        {showSafeAreas ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
        Safe areas
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* Error */}
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      {/* Re-export button */}
      <button
        type="button"
        onClick={handleReexport}
        disabled={!valid || isSubmitting || (!timingChanged && !captionChanged)}
        className="w-full py-2 text-sm font-semibold rounded-xl transition-opacity disabled:opacity-40"
        style={{ background: "#FF3B5C", color: "#fff" }}
      >
        {isSubmitting ? "Sending…" : "Re-export Clip"}
      </button>

      <p className="text-xs text-center" style={{ color: "var(--dash-text-muted)" }}>
        Preview is approximate. Final clip is rendered by the server.
      </p>
    </div>
  )
}
