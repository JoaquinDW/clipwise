"use client"

import React, { useCallback, useEffect, useRef } from "react"
import { PlayCircleIcon } from "@heroicons/react/24/outline"
import { SafeAreaOverlay } from "./ClipEditor"
import Spinner from "@/app/ui/spinner"
import { CaptionOverlay } from "./CaptionCanvas"
import { useClipEditorStore } from "@/lib/store/clip-editor.store"
import type { CaptionsResult } from "@/lib/ai/captions"

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
  parentClipId?: string | null
  captions: CaptionsResult | null
  proxyUrl: string | null
  captionStyle: string | null
  captionPosition: "top" | "center" | "bottom" | null
  captionSize: "small" | "medium" | "large" | null
}

interface ClipPreviewProps {
  clips: Clip[]
  activeClipId: string | null
  videoRef: React.RefObject<HTMLVideoElement>
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// ── Editable video player (main area) ────────────────────────────────────────

function EditableVideoPlayer({
  src,
  clipStartTime,
  editedStart,
  editedEnd,
  captions,
  captionStyle,
  captionPosition,
  captionSize,
  showSafeAreas,
  draggingHandle,
  onTimeUpdate,
  videoRef,
}: {
  src: string
  clipStartTime: number
  editedStart: number
  editedEnd: number
  captions: CaptionsResult | null
  captionStyle: string
  captionPosition: "top" | "center" | "bottom"
  captionSize: "small" | "medium" | "large"
  showSafeAreas: boolean
  draggingHandle: "start" | "end" | null
  onTimeUpdate: (t: number) => void
  videoRef: React.RefObject<HTMLVideoElement>
}) {
  const rafRef = useRef<number | null>(null)
  const playingRef = useRef(false)

  const toProxy = (originalTime: number) => Math.max(0, originalTime - clipStartTime)

  // While a timeline handle is being dragged, the frame under the handle is the
  // frame on screen. Outside a drag the timeline seeks explicitly (on release,
  // on keyboard nudge), so seeking here too would fight it.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !draggingHandle) return
    video.pause()
    video.currentTime = toProxy(draggingHandle === "end" ? editedEnd : editedStart)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedStart, editedEnd, draggingHandle, clipStartTime])

  // Pause at editedEnd boundary
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const proxyEnd = toProxy(editedEnd)
    const handleTimeUpdate = () => {
      if (video.currentTime >= Math.min(proxyEnd, video.duration)) {
        video.pause()
        video.currentTime = toProxy(editedStart)
      }
    }
    video.addEventListener("timeupdate", handleTimeUpdate)
    return () => video.removeEventListener("timeupdate", handleTimeUpdate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedStart, editedEnd, clipStartTime])

  // RAF loop for smooth caption sync, reports time in original-video space
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const tick = () => {
      if (playingRef.current && video) {
        onTimeUpdate(video.currentTime + clipStartTime)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const onPlay = () => { playingRef.current = true }
    const onPause = () => {
      playingRef.current = false
      onTimeUpdate(video.currentTime + clipStartTime)
    }

    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipStartTime, onTimeUpdate])

  // A selector, not the whole store: currentTime ticks every animation frame,
  // and subscribing to everything re-rendered this subtree along with it.
  const captionTime = useClipEditorStore((s) => s.currentTime) - clipStartTime

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "0.75rem", overflow: "hidden", background: "#000" }}>
      <video
        ref={videoRef}
        src={src}
        controls
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      <SafeAreaOverlay show={showSafeAreas} />
      <CaptionOverlay
        captions={captions}
        currentTime={captionTime}
        captionStyle={captionStyle}
        captionPosition={captionPosition}
        captionSize={captionSize}
      />
    </div>
  )
}

// ── Main preview component ────────────────────────────────────────────────────

export default function ClipPreview({
  clips,
  activeClipId,
  videoRef,
}: ClipPreviewProps) {
  // Selectors, not the whole store. Subscribing to everything here re-rendered
  // this component on every currentTime tick, which changed `store`'s identity
  // ~60x/s and so rebuilt handleTimeUpdate and the player's RAF effect — tearing
  // down and re-adding its play/pause listeners each frame. currentTime itself
  // is read one level down, by the only thing that needs it.
  const captionStyle = useClipEditorStore((s) => s.captionStyle)
  const captionPosition = useClipEditorStore((s) => s.captionPosition)
  const captionSize = useClipEditorStore((s) => s.captionSize)
  const showSafeAreas = useClipEditorStore((s) => s.showSafeAreas)
  const deltaStart = useClipEditorStore((s) => s.deltaStart)
  const deltaEnd = useClipEditorStore((s) => s.deltaEnd)
  const draggingHandle = useClipEditorStore((s) => s.draggingHandle)
  const setCurrentTime = useClipEditorStore((s) => s.setCurrentTime)

  const activeClip = clips.find((c) => c.id === activeClipId) ?? null

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t)
  }, [setCurrentTime])

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

  const editedStart = activeClip.startTime + deltaStart
  const editedEnd = activeClip.endTime + deltaEnd
  const videoSrc = activeClip.proxyUrl ?? activeClip.storageUrl!

  // A render already has its captions in the pixels; drawing the live overlay on
  // top of one would show every line twice. The clip list only ever surfaces
  // caption-free originals, so this is a backstop, not the normal path.
  const captionsAreBurnedIn =
    (activeClip.metadata as { burnCaptions?: boolean } | null)?.burnCaptions === true

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        {/* 9:16 player — height driven by viewport, width by aspect-ratio */}
        <div
          style={{
            aspectRatio: "9/16",
            height: "calc(100vh - 16rem - var(--clip-timeline-h, 0px))",
            maxHeight: "80vh",
            minHeight: 240,
          }}
        >
          {isGenerating ? (
            <div
              className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{
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
                  <Spinner className="h-8 w-8" />
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
            <EditableVideoPlayer
              src={videoSrc}
              clipStartTime={activeClip.startTime}
              editedStart={editedStart}
              editedEnd={editedEnd}
              captions={captionsAreBurnedIn ? null : activeClip.captions}
              captionStyle={captionStyle}
              captionPosition={captionPosition}
              captionSize={captionSize}
              showSafeAreas={showSafeAreas}
              draggingHandle={draggingHandle}
              onTimeUpdate={handleTimeUpdate}
              videoRef={videoRef}
            />
          )}
        </div>

        {/* Clip info */}
        <div className="flex flex-col items-center gap-1 text-center w-full max-w-xs">
          <h3
            className="font-semibold text-sm leading-snug"
            style={{ fontFamily: "var(--font-syne), sans-serif", color: "#f2ede8" }}
          >
            {activeClip.title}
          </h3>
          <p className="text-xs" style={{ color: "var(--dash-text-muted)" }}>
            {activeClip.startTime.toFixed(1)}s – {activeClip.endTime.toFixed(1)}s · {formatDuration(activeClip.duration)}
          </p>
        </div>
      </div>
    </>
  )
}
