"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { getCaptionCSSStyle } from "@/lib/ai/caption-styles"
import type { CaptionsResult, CaptionSegment } from "@/lib/ai/captions"
import { useClipEditorStore } from "@/lib/store/clip-editor.store"

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
  videoRef: React.RefObject<HTMLVideoElement>
  onExportStart: (newClipId: string) => void
}

const MAX_DELTA = 15
const MIN_DURATION = 10
const MAX_DURATION = 90

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

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

// ── Interactive scrub bar ────────────────────────────────────────────────────

export function ScrubBar({
  windowStart,
  windowDuration,
  editedStart,
  editedEnd,
  currentTime,
  onScrub,
}: {
  windowStart: number
  windowDuration: number
  editedStart: number
  editedEnd: number
  currentTime: number
  onScrub: (time: number) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)

  const barLeft = clamp(((editedStart - windowStart) / windowDuration) * 100, 0, 100)
  const barWidth = clamp(((editedEnd - editedStart) / windowDuration) * 100, 0, 100 - barLeft)
  const playheadLeft = clamp(((currentTime - windowStart) / windowDuration) * 100, barLeft, barLeft + barWidth)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = barRef.current!.getBoundingClientRect()
    const seek = (clientX: number) => {
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      const time = windowStart + ratio * windowDuration
      onScrub(clamp(time, editedStart, editedEnd))
    }
    seek(e.clientX)

    const onMove = (ev: PointerEvent) => seek(ev.clientX)
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  return (
    <div className="w-full">
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        className="relative w-full h-3 rounded-full overflow-visible"
        style={{ background: "rgba(255,255,255,0.08)", cursor: "pointer", touchAction: "none" }}
      >
        {/* Active clip range */}
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            left: `${barLeft}%`,
            width: `${barWidth}%`,
            background: "rgba(255,59,92,0.35)",
          }}
        />
        {/* Playhead */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${playheadLeft}%`,
            transform: "translate(-50%, -50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#FF3B5C",
            boxShadow: "0 0 0 2px rgba(255,59,92,0.3)",
            pointerEvents: "none",
          }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--dash-text-muted)" }}>
        <span>{editedStart.toFixed(1)}s</span>
        <span>{(editedEnd - editedStart).toFixed(1)}s</span>
        <span>{editedEnd.toFixed(1)}s</span>
      </div>
    </div>
  )
}

// ── Main editor (controls only) ──────────────────────────────────────────────

export default function ClipEditor({ clip, videoRef, onExportStart }: ClipEditorProps) {
  const store = useClipEditorStore()

  // Reset store when clip changes
  useEffect(() => {
    store.reset(clip)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.id])

  const { deltaStart, deltaEnd, captionStyle, captionPosition, captionSize, showSafeAreas, currentTime } = store

  const editedStart = clip.startTime + deltaStart
  const editedEnd = clip.endTime + deltaEnd
  const editedDuration = editedEnd - editedStart

  const timingChanged = deltaStart !== 0 || deltaEnd !== 0
  const captionChanged =
    captionStyle !== (clip.captionStyle ?? "classic") ||
    captionPosition !== (clip.captionPosition ?? "bottom") ||
    captionSize !== (clip.captionSize ?? "medium")

  const valid =
    Math.abs(deltaStart) <= MAX_DELTA &&
    Math.abs(deltaEnd) <= MAX_DELTA &&
    editedDuration >= MIN_DURATION &&
    editedDuration <= MAX_DURATION &&
    editedStart >= 0

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function adjustStart(delta: number) {
    store.setDeltaStart((() => {
      const next = deltaStart + delta
      if (Math.abs(next) > MAX_DELTA) return deltaStart
      const nextDuration = clip.endTime + deltaEnd - (clip.startTime + next)
      if (nextDuration < MIN_DURATION || nextDuration > MAX_DURATION) return deltaStart
      if (clip.startTime + next < 0) return deltaStart
      return next
    })())
  }

  function adjustEnd(delta: number) {
    store.setDeltaEnd((() => {
      const next = deltaEnd + delta
      if (Math.abs(next) > MAX_DELTA) return deltaEnd
      const nextDuration = clip.endTime + next - (clip.startTime + deltaStart)
      if (nextDuration < MIN_DURATION || nextDuration > MAX_DURATION) return deltaEnd
      return next
    })())
  }

  const handleScrub = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, time - clip.startTime)
    store.setCurrentTime(time)
  }, [videoRef, store, clip.startTime])

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

  const windowStart = clip.startTime - MAX_DELTA
  const windowEnd = clip.endTime + MAX_DELTA
  const windowDuration = windowEnd - windowStart

  const AdjustButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 text-xs font-medium rounded-md transition-colors"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "var(--dash-text-secondary)",
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Scrub bar */}
      <ScrubBar
        windowStart={windowStart}
        windowDuration={windowDuration}
        editedStart={editedStart}
        editedEnd={editedEnd}
        currentTime={currentTime}
        onScrub={handleScrub}
      />

      {(deltaStart < 0 || deltaEnd > 0) && (
        <p className="text-xs text-center" style={{ color: "var(--dash-text-muted)" }}>
          Extended footage only visible after re-export
        </p>
      )}

      {/* Timing controls */}
      <div className="flex flex-col gap-2">
        {(["Start", "End"] as const).map((label) => {
          const delta = label === "Start" ? deltaStart : deltaEnd
          const adjust = label === "Start" ? adjustStart : adjustEnd
          return (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-xs w-12 shrink-0" style={{ color: "var(--dash-text-muted)" }}>{label}</span>
              <div className="flex gap-1">
                <AdjustButton label="-2s" onClick={() => adjust(-2)} />
                <AdjustButton label="-1s" onClick={() => adjust(-1)} />
                <AdjustButton label="+1s" onClick={() => adjust(+1)} />
                <AdjustButton label="+2s" onClick={() => adjust(+2)} />
              </div>
              <span className="text-xs w-10 text-right shrink-0" style={{ color: delta !== 0 ? "#FF3B5C" : "var(--dash-text-muted)" }}>
                {delta > 0 ? `+${delta}s` : delta !== 0 ? `${delta}s` : "—"}
              </span>
            </div>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

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
