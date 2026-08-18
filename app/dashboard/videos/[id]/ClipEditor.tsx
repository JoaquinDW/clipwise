"use client"

import React from "react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { useClipEditorStore } from "@/lib/store/clip-editor.store"
import { getAllCaptionPresets } from "@/lib/captions/presets"

// Derived from the presets rather than hand-listed, so a new preset appears in
// the picker without a second edit.
const STYLE_OPTIONS = getAllCaptionPresets().map((preset) => ({
  key: preset.id,
  label: preset.name,
}))

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

/**
 * Controls only. These write to the shared editor store; Download is what turns
 * the resulting settings into a file, rendering first when it has to.
 */
export default function ClipEditor() {
  // Selectors rather than the whole store: currentTime ticks with playback, and
  // these controls have no reason to re-render along with it.
  const captionStyle = useClipEditorStore((s) => s.captionStyle)
  const captionPosition = useClipEditorStore((s) => s.captionPosition)
  const captionSize = useClipEditorStore((s) => s.captionSize)
  const showSafeAreas = useClipEditorStore((s) => s.showSafeAreas)
  const setCaptionStyle = useClipEditorStore((s) => s.setCaptionStyle)
  const setCaptionPosition = useClipEditorStore((s) => s.setCaptionPosition)
  const setCaptionSize = useClipEditorStore((s) => s.setCaptionSize)
  const setShowSafeAreas = useClipEditorStore((s) => s.setShowSafeAreas)

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
              onClick={() => setCaptionStyle(opt.key)}
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
              onClick={() => setCaptionPosition(opt.key)}
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
              onClick={() => setCaptionSize(opt.key)}
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
        onClick={() => setShowSafeAreas(!showSafeAreas)}
        className="flex items-center gap-1.5 text-xs"
        style={{ color: showSafeAreas ? "#FF3B5C" : "var(--dash-text-muted)" }}
      >
        {showSafeAreas ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
        Safe areas
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      <p className="text-xs text-center" style={{ color: "var(--dash-text-muted)" }}>
        Preview is approximate. Download renders the final clip on the server.
      </p>
    </div>
  )
}
