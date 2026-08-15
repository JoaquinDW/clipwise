"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline"
import { useClipEditorStore } from "@/lib/store/clip-editor.store"
import {
  MAX_DELTA,
  MIN_DURATION,
  MAX_DURATION,
  clampTrim,
  handleTimeRange,
  type TrimHandle,
} from "@/lib/video/trim-limits"
import type { CaptionsResult } from "@/lib/ai/captions"

interface TimelineClip {
  id: string
  startTime: number
  endTime: number
  proxyUrl: string | null
  storageUrl: string | null
  thumbnailUrl?: string | null
  captions: CaptionsResult | null
}

interface ClipTimelineProps {
  clip: TimelineClip
  videoRef: React.RefObject<HTMLVideoElement>
}

/** Total height of the bar. Mirrored by --clip-timeline-h in ClipsSection. */
export const TIMELINE_HEIGHT = 136

const ACCENT = "#FF3B5C"
/** Visual width of a drag handle; its pointer area is widened separately. */
const HANDLE_WIDTH = 14
/** Snap radius, in seconds, around caption edges and whole seconds. */
const SNAP_RADIUS = 0.35

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

// ── Filmstrip extraction ──────────────────────────────────────────────────────

/**
 * Frames are decoded in the browser from the proxy that the player already
 * streams — no worker, no storage, no extra request beyond the one the video
 * element makes anyway. Results are cached per clip so revisiting is instant.
 */
const filmstripCache = new Map<string, string[]>()

type FilmstripState = { frames: string[]; status: "loading" | "ready" | "unavailable" }

function useFilmstrip(
  clipId: string,
  src: string | null,
  frameCount: number,
  enabled: boolean
): FilmstripState {
  const cacheKey = `${clipId}:${frameCount}`
  const [state, setState] = useState<FilmstripState>(() =>
    filmstripCache.has(cacheKey)
      ? { frames: filmstripCache.get(cacheKey)!, status: "ready" }
      : { frames: [], status: "loading" }
  )

  useEffect(() => {
    // Still waiting on the first width measurement — stay in the skeleton
    // rather than flashing the no-frames fallback.
    if (!enabled) return
    if (!src) {
      setState({ frames: [], status: "unavailable" })
      return
    }

    const cached = filmstripCache.get(cacheKey)
    if (cached) {
      setState({ frames: cached, status: "ready" })
      return
    }

    let cancelled = false
    setState({ frames: [], status: "loading" })

    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.muted = true
    video.preload = "auto"
    video.src = src

    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 114 // 9:16
    const ctx = canvas.getContext("2d")

    const seekTo = (time: number) =>
      new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked)
          video.removeEventListener("error", onError)
          resolve()
        }
        const onError = () => {
          video.removeEventListener("seeked", onSeeked)
          video.removeEventListener("error", onError)
          reject(new Error("seek failed"))
        }
        video.addEventListener("seeked", onSeeked)
        video.addEventListener("error", onError)
        video.currentTime = time
      })

    const run = async () => {
      try {
        if (!ctx) throw new Error("no 2d context")

        await new Promise<void>((resolve, reject) => {
          if (video.readyState >= 1) return resolve()
          video.addEventListener("loadedmetadata", () => resolve(), { once: true })
          video.addEventListener("error", () => reject(new Error("load failed")), { once: true })
        })

        const duration = video.duration
        if (!Number.isFinite(duration) || duration <= 0) throw new Error("no duration")

        const frames: string[] = []
        for (let i = 0; i < frameCount; i++) {
          if (cancelled) return
          await seekTo(((i + 0.5) / frameCount) * duration)
          if (cancelled) return
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          // Throws SecurityError if the storage host did not allow CORS.
          frames.push(canvas.toDataURL("image/jpeg", 0.6))
          if (!cancelled) setState({ frames: [...frames], status: "loading" })
        }

        if (cancelled) return
        filmstripCache.set(cacheKey, frames)
        setState({ frames, status: "ready" })
      } catch (err) {
        if (cancelled) return
        console.warn("[timeline] Filmstrip unavailable, falling back to a plain track:", err)
        setState({ frames: [], status: "unavailable" })
      } finally {
        video.removeAttribute("src")
        video.load()
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [cacheKey, src, frameCount, enabled])

  return state
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export default function ClipTimeline({ clip, videoRef }: ClipTimelineProps) {
  const {
    deltaStart,
    deltaEnd,
    currentTime,
    draggingHandle,
    setDeltaStart,
    setDeltaEnd,
    setCurrentTime,
    setDraggingHandle,
  } = useClipEditorStore()

  const trackRef = useRef<HTMLDivElement>(null)
  const [trackWidth, setTrackWidth] = useState(0)
  const [snapLine, setSnapLine] = useState<number | null>(null)

  const editedStart = clip.startTime + deltaStart
  const editedEnd = clip.endTime + deltaEnd
  const editedDuration = editedEnd - editedStart

  // The visible window is the full range either handle could ever reach.
  const windowStart = clip.startTime - MAX_DELTA
  const windowEnd = clip.endTime + MAX_DELTA
  const windowDuration = windowEnd - windowStart

  const toPercent = useCallback(
    (time: number) => clamp(((time - windowStart) / windowDuration) * 100, 0, 100),
    [windowStart, windowDuration]
  )

  // Track width drives how many frames are worth decoding.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setTrackWidth(entry.contentRect.width))
    observer.observe(el)
    setTrackWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  // Frames only cover the clip's own range, which is a fraction of the window.
  const coverageRatio = (clip.endTime - clip.startTime) / windowDuration
  const frameCount = clamp(Math.round((trackWidth * coverageRatio) / 56), 8, 24)
  const filmstripSrc = clip.proxyUrl ?? clip.storageUrl
  const { frames, status: filmstripStatus } = useFilmstrip(
    clip.id,
    filmstripSrc,
    frameCount,
    trackWidth > 0
  )

  // Snap targets: caption boundaries (stored clip-relative) plus whole seconds.
  const snapTargets = useMemo(() => {
    const targets: number[] = []
    for (const segment of clip.captions?.captions ?? []) {
      targets.push(clip.startTime + segment.startTime, clip.startTime + segment.endTime)
    }
    for (let t = Math.ceil(windowStart); t <= windowEnd; t++) targets.push(t)
    return targets
  }, [clip.captions, clip.startTime, windowStart, windowEnd])

  const applySnap = useCallback(
    (time: number, disabled: boolean) => {
      if (disabled) {
        setSnapLine(null)
        return time
      }
      let best: number | null = null
      let bestDistance = SNAP_RADIUS
      for (const target of snapTargets) {
        const distance = Math.abs(target - time)
        if (distance < bestDistance) {
          bestDistance = distance
          best = target
        }
      }
      setSnapLine(best)
      return best ?? time
    },
    [snapTargets]
  )

  const timeAtClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current!.getBoundingClientRect()
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      return windowStart + ratio * windowDuration
    },
    [windowStart, windowDuration]
  )

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current
      if (video) video.currentTime = Math.max(0, time - clip.startTime)
      setCurrentTime(time)
    },
    [videoRef, clip.startTime, setCurrentTime]
  )

  // ── Drag a trim handle ─────────────────────────────────────────────────────

  function startHandleDrag(handle: TrimHandle, e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraggingHandle(handle)
    videoRef.current?.pause()

    const move = (clientX: number, altKey: boolean) => {
      const raw = applySnap(timeAtClientX(clientX), altKey)
      const { deltaStart: ds, deltaEnd: de } = useClipEditorStore.getState()
      const delta = clampTrim(clip, { deltaStart: ds, deltaEnd: de }, handle, raw)
      if (handle === "start") setDeltaStart(delta)
      else setDeltaEnd(delta)
    }

    move(e.clientX, e.altKey)

    const onMove = (ev: PointerEvent) => move(ev.clientX, ev.altKey)
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      setDraggingHandle(null)
      setSnapLine(null)

      // Park the playhead where the user can see the edge they just moved.
      const { deltaStart: ds, deltaEnd: de } = useClipEditorStore.getState()
      const start = clip.startTime + ds
      const end = clip.endTime + de
      seek(handle === "start" ? start : Math.max(start, end - 1.5))
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  // ── Scrub the track ────────────────────────────────────────────────────────

  function startScrub(e: React.PointerEvent<HTMLDivElement>) {
    const scrubTo = (clientX: number) =>
      seek(clamp(timeAtClientX(clientX), editedStart, editedEnd))
    scrubTo(e.clientX)

    const onMove = (ev: PointerEvent) => scrubTo(ev.clientX)
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  // ── Keyboard nudging (replaces the old -2s/+2s buttons) ────────────────────

  function handleKeyDown(handle: TrimHandle, e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 1 : 0.1
    const current = handle === "start" ? editedStart : editedEnd
    const { min, max } = handleTimeRange(clip, { deltaStart, deltaEnd }, handle)

    let target: number
    if (e.key === "ArrowLeft") target = current - step
    else if (e.key === "ArrowRight") target = current + step
    else if (e.key === "Home") target = min
    else if (e.key === "End") target = max
    else return

    e.preventDefault()
    const delta = clampTrim(clip, { deltaStart, deltaEnd }, handle, target)
    if (handle === "start") setDeltaStart(delta)
    else setDeltaEnd(delta)
    seek(handle === "start" ? clip.startTime + delta : clip.endTime + delta)
  }

  function resetTrim() {
    setDeltaStart(0)
    setDeltaEnd(0)
    seek(clip.startTime)
  }

  // ── Derived geometry ───────────────────────────────────────────────────────

  const selectionLeft = toPercent(editedStart)
  const selectionRight = toPercent(editedEnd)
  const selectionWidth = Math.max(selectionRight - selectionLeft, 0)
  const coverageLeft = toPercent(clip.startTime)
  const coverageWidth = Math.max(toPercent(clip.endTime) - coverageLeft, 0)
  const playheadLeft = clamp(toPercent(currentTime), selectionLeft, selectionRight)

  const atDurationLimit =
    editedDuration <= MIN_DURATION + 0.05 || editedDuration >= MAX_DURATION - 0.05
  const isExtending = deltaStart < 0 || deltaEnd > 0
  const isTrimmed = deltaStart !== 0 || deltaEnd !== 0

  // Ruler: a label every 15s, ticks every 5s, thinned out when space is tight.
  const ticks = useMemo(() => {
    const out: { time: number; major: boolean }[] = []
    const first = Math.ceil(windowStart / 5) * 5
    for (let t = first; t <= windowEnd; t += 5) {
      out.push({ time: t, major: t % 15 === 0 })
    }
    return out
  }, [windowStart, windowEnd])
  const labelsFit = trackWidth > 0 && (trackWidth / windowDuration) * 15 > 48

  return (
    <div
      className="flex-none w-full flex flex-col px-6 pt-2 pb-3 gap-1.5"
      style={{
        height: TIMELINE_HEIGHT,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "#0e0f11",
      }}
    >
      {/* Toolbar */}
      <div className="flex-none flex items-center gap-4 h-6">
        <h2
          className="text-xs font-semibold uppercase tracking-wider flex-none"
          style={{ color: "var(--dash-text-muted)" }}
        >
          Timeline
        </h2>

        <div
          className="flex items-center gap-3 text-xs flex-none"
          style={{ fontVariantNumeric: "tabular-nums", color: "var(--dash-text-secondary)" }}
        >
          <span>
            Start <span style={{ color: deltaStart !== 0 ? ACCENT : "#f2ede8" }}>{editedStart.toFixed(1)}s</span>
          </span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <span>
            Duration{" "}
            <span style={{ color: atDurationLimit ? ACCENT : "#f2ede8" }}>
              {editedDuration.toFixed(1)}s
            </span>
          </span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <span>
            End <span style={{ color: deltaEnd !== 0 ? ACCENT : "#f2ede8" }}>{editedEnd.toFixed(1)}s</span>
          </span>
        </div>

        <div className="flex-1 min-w-0 text-right">
          {isExtending && (
            <span className="text-xs truncate" style={{ color: "var(--dash-text-muted)" }}>
              Extended footage only visible after re-export
            </span>
          )}
        </div>

        {isTrimmed && (
          <button
            type="button"
            onClick={resetTrim}
            className="flex-none inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--dash-text-secondary)",
            }}
          >
            <ArrowUturnLeftIcon className="w-3 h-3" />
            Reset trim
          </button>
        )}
      </div>

      {/* Ruler */}
      <div className="flex-none relative w-full h-5 select-none">
        {ticks.map(({ time, major }) => (
          <div
            key={time}
            className="absolute top-0"
            style={{ left: `${toPercent(time)}%`, transform: "translateX(-50%)" }}
          >
            <div
              style={{
                width: 1,
                height: major ? 6 : 3,
                margin: "0 auto",
                background: major ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)",
              }}
            />
            {major && labelsFit && (
              <span
                className="block text-[10px] leading-none mt-0.5"
                style={{ color: "var(--dash-text-muted)", fontVariantNumeric: "tabular-nums" }}
              >
                {formatTimecode(time)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={startScrub}
        className="flex-1 relative w-full rounded-lg overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.04)",
          cursor: "pointer",
          touchAction: "none",
          minHeight: 56,
        }}
      >
        {/* Margins with no footage behind them */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 6px, transparent 6px 12px)",
          }}
        />

        {/* Filmstrip, spanning only the clip's own range */}
        <div
          className="absolute top-0 bottom-0 flex overflow-hidden"
          style={{ left: `${coverageLeft}%`, width: `${coverageWidth}%`, background: "#000" }}
        >
          {filmstripStatus === "unavailable" ? (
            <div
              className="w-full h-full"
              style={{
                background: clip.thumbnailUrl
                  ? `center / cover no-repeat url(${clip.thumbnailUrl})`
                  : "rgba(255,255,255,0.10)",
                opacity: clip.thumbnailUrl ? 0.4 : 1,
              }}
            />
          ) : frames.length === 0 ? (
            <div className="w-full h-full clip-timeline-shimmer" />
          ) : (
            frames.map((frame, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={frame}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-full flex-1 min-w-0 object-cover"
              />
            ))
          )}
        </div>

        {/* Dim everything outside the selection */}
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none"
          style={{ width: `${selectionLeft}%`, background: "rgba(0,0,0,0.55)" }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none"
          style={{ width: `${100 - selectionRight}%`, background: "rgba(0,0,0,0.55)" }}
        />

        {/* Selection frame */}
        <div
          className="absolute top-0 bottom-0 rounded-lg pointer-events-none"
          style={{
            left: `${selectionLeft}%`,
            width: `${selectionWidth}%`,
            border: `2px solid ${ACCENT}`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
          }}
        />

        {/* Snap guide */}
        {snapLine !== null && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: `${toPercent(snapLine)}%`, width: 1, background: "rgba(255,255,255,0.7)" }}
          />
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: `${playheadLeft}%`, width: 2, background: "#fff", transform: "translateX(-1px)" }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "5px solid #fff",
            }}
          />
        </div>

        {/* Trim handles */}
        {(["start", "end"] as const).map((handle) => {
          const time = handle === "start" ? editedStart : editedEnd
          const { min, max } = handleTimeRange(clip, { deltaStart, deltaEnd }, handle)
          return (
            <div
              key={handle}
              role="slider"
              tabIndex={0}
              aria-label={handle === "start" ? "Clip start" : "Clip end"}
              aria-valuemin={Number(min.toFixed(1))}
              aria-valuemax={Number(max.toFixed(1))}
              aria-valuenow={Number(time.toFixed(1))}
              aria-valuetext={`${time.toFixed(1)} seconds, clip duration ${editedDuration.toFixed(1)} seconds`}
              onPointerDown={(e) => startHandleDrag(handle, e)}
              onKeyDown={(e) => handleKeyDown(handle, e)}
              className="clip-timeline-handle absolute top-0 bottom-0 flex items-center justify-center"
              style={{
                left: `${handle === "start" ? selectionLeft : selectionRight}%`,
                width: HANDLE_WIDTH,
                // Handles sit *inside* the selection: at the extremes of the
                // window an outward offset would be cut off by overflow-hidden.
                transform: `translateX(${handle === "start" ? 0 : -HANDLE_WIDTH}px)`,
                background: ACCENT,
                borderRadius:
                  handle === "start" ? "6px 0 0 6px" : "0 6px 6px 0",
                cursor: "ew-resize",
                touchAction: "none",
                zIndex: 2,
                opacity: draggingHandle && draggingHandle !== handle ? 0.6 : 1,
              }}
            >
              <div className="flex gap-[2px]" aria-hidden="true">
                <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.6)" }} />
                <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.6)" }} />
                <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.6)" }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
