"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"

import type { CaptionsResult } from "@/lib/ai/captions"
import { drawCaptionFrame, createMeasurer, measureAscentRatio } from "@/lib/captions/draw"
import {
  buildCaptionPages,
  captionFrameAt,
  flattenCaptionWords,
} from "@/lib/captions/layout"
import { loadCaptionFont } from "@/lib/captions/fonts"
import {
  COMPOSITION_HEIGHT,
  COMPOSITION_WIDTH,
  getCaptionPreset,
  resolveFontSize,
  type CaptionPosition,
  type CaptionSize,
} from "@/lib/captions/presets"

/**
 * The live caption preview.
 *
 * Draws at the full 1080x1920 composition and lets CSS scale the canvas down to
 * the player, so the only difference between this and the exported file is that
 * one scale factor. The DOM overlay this replaced set font sizes in absolute px
 * against a player whose height followed the viewport, which meant the preview's
 * caption changed size with the browser window while the export never did.
 */
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
  captionPosition: CaptionPosition
  captionSize: CaptionSize
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const preset = useMemo(() => getCaptionPreset(captionStyle), [captionStyle])

  // Canvas silently draws in a fallback face when the font has not finished
  // loading, and never repaints once it arrives — so nothing is drawn until it
  // is genuinely ready.
  const [fontReady, setFontReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    setFontReady(false)
    loadCaptionFont(preset.typography.font)
      .then(() => { if (!cancelled) setFontReady(true) })
      .catch(() => { if (!cancelled) setFontReady(false) })
    return () => { cancelled = true }
  }, [preset])

  const pages = useMemo(() => {
    if (!captions) return []
    return buildCaptionPages(flattenCaptionWords(captions), preset)
  }, [captions, preset])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, COMPOSITION_WIDTH, COMPOSITION_HEIGHT)
    if (!fontReady || pages.length === 0) return

    const fontSize = resolveFontSize(preset, captionSize)
    const frame = captionFrameAt(pages, currentTime, {
      preset,
      captionSize,
      captionPosition,
      measure: createMeasurer(ctx, preset, fontSize),
      ascentRatio: measureAscentRatio(ctx, preset, fontSize),
    })
    if (!frame) return

    drawCaptionFrame(ctx, frame)
  }, [pages, currentTime, preset, captionPosition, captionSize, fontReady])

  if (!captions) return null

  return (
    <canvas
      ref={canvasRef}
      width={COMPOSITION_WIDTH}
      height={COMPOSITION_HEIGHT}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  )
}
