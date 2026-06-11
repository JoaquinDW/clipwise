import { useMemo } from "react"
import * as THREE from "three"
import { interpolate, random, useCurrentFrame, Easing } from "remotion"
import { HIGHLIGHTS, TIMING } from "../theme"
import { roundRect, createGlowTexture } from "./textures"

const CANVAS_W = 1280
const CANVAS_H = 720
export const SCREEN_W = 11.2
export const SCREEN_H = 6.3

const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Redraws the "raw footage" screen every frame: waveform, scan state, highlight markers. */
const drawScreen = (ctx: CanvasRenderingContext2D, frame: number) => {
  const w = CANVAS_W
  const h = CANVAS_H

  ctx.clearRect(0, 0, w, h)
  roundRect(ctx, 0, 0, w, h, 28)
  ctx.save()
  ctx.clip()

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, "#131316")
  bg.addColorStop(1, "#0a0a0c")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Header: filename + blinking REC
  ctx.font = '600 22px "DM Sans", monospace'
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#555"
  ctx.fillText("PODCAST_EP-042.MP4", 48, 52)
  ctx.fillText("01:24:36", w - 160, 52)
  const blink = (Math.sin(frame * 0.25) + 1) / 2
  ctx.fillStyle = `rgba(255,59,92,${0.35 + blink * 0.65})`
  ctx.beginPath()
  ctx.arc(w - 210, 52, 8, 0, Math.PI * 2)
  ctx.fill()

  // Scan progress (0..1)
  const scan = interpolate(frame, [TIMING.scanStart, TIMING.scanEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Waveform
  const bars = 90
  const margin = 60
  const barSpan = (w - margin * 2) / bars
  const midY = h * 0.46
  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1)
    const seed = random(`bar-${i}`)
    const wobble = Math.sin(frame * 0.06 + i * 0.45) * 0.18
    const amp = (0.25 + seed * 0.75 + wobble) * 130
    const x = margin + i * barSpan

    // Bars inside a discovered highlight window light up
    const hot = HIGHLIGHTS.some((hl) => scan >= hl.at && Math.abs(t - hl.at) < 0.045)
    if (hot) {
      const grad = ctx.createLinearGradient(0, midY - amp, 0, midY + amp)
      grad.addColorStop(0, "#FF3B5C")
      grad.addColorStop(1, "#FF8C00")
      ctx.fillStyle = grad
      ctx.shadowColor = "rgba(255,59,92,0.8)"
      ctx.shadowBlur = 16
    } else {
      ctx.fillStyle = "#37373d"
      ctx.shadowBlur = 0
    }
    roundRect(ctx, x, midY - amp, barSpan * 0.55, amp * 2, 3)
    ctx.fill()
  }
  ctx.shadowBlur = 0

  // Timeline track
  const trackY = h - 92
  ctx.fillStyle = "#1d1d22"
  roundRect(ctx, margin, trackY, w - margin * 2, 10, 5)
  ctx.fill()

  // Scan fill on the track
  if (scan > 0) {
    const grad = ctx.createLinearGradient(margin, 0, w - margin, 0)
    grad.addColorStop(0, "#FF3B5C")
    grad.addColorStop(1, "#FF8C00")
    ctx.fillStyle = grad
    roundRect(ctx, margin, trackY, (w - margin * 2) * scan, 10, 5)
    ctx.fill()
  }

  // Highlight markers + score chips (pop in when the scan passes them)
  for (const hl of HIGHLIGHTS) {
    if (scan < hl.at) continue
    const foundAt = TIMING.scanStart + hl.at * (TIMING.scanEnd - TIMING.scanStart)
    const pop = easeOutBack(Math.min(1, Math.max(0, (frame - foundAt) / 12)))
    const x = margin + (w - margin * 2) * hl.at

    ctx.save()
    ctx.translate(x, trackY + 5)
    ctx.scale(pop, pop)

    // Glowing marker dot
    ctx.shadowColor = "rgba(255,59,92,0.95)"
    ctx.shadowBlur = 22
    ctx.fillStyle = "#FF3B5C"
    ctx.beginPath()
    ctx.arc(0, 0, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Score chip
    ctx.font = '700 21px "DM Sans", sans-serif'
    ctx.textAlign = "center"
    const label = `✦ ${hl.score}`
    const cw = ctx.measureText(label).width + 30
    ctx.fillStyle = "#FF3B5C"
    roundRect(ctx, -cw / 2, -62, cw, 36, 8)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.fillText(label, 0, -43)
    ctx.restore()
  }
  ctx.restore()

  // Border
  ctx.strokeStyle = "#27272c"
  ctx.lineWidth = 4
  roundRect(ctx, 2, 2, w - 4, h - 4, 26)
  ctx.stroke()
}

export const MasterScreen = () => {
  const frame = useCurrentFrame()

  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return { canvas, texture }
  }, [])

  drawScreen(canvas.getContext("2d")!, frame)
  texture.needsUpdate = true

  // Recede + dim once the clips fly out
  const z = interpolate(frame, [TIMING.splitStart, TIMING.splitStart + 80], [0, -2.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  })
  const opacity = interpolate(frame, [TIMING.splitStart + 10, TIMING.splitStart + 70], [1, 0.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <group position={[0, 0.5, z]}>
      <mesh>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={texture} transparent opacity={opacity} />
      </mesh>
    </group>
  )
}

/** Vertical scan beam that sweeps across the master screen. */
export const ScanBeam = () => {
  const frame = useCurrentFrame()
  const glow = useMemo(() => createGlowTexture(), [])

  if (frame < TIMING.scanStart - 12 || frame > TIMING.scanEnd + 20) return null

  const x = interpolate(frame, [TIMING.scanStart, TIMING.scanEnd], [-SCREEN_W / 2, SCREEN_W / 2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  })
  const opacity = interpolate(
    frame,
    [TIMING.scanStart - 12, TIMING.scanStart + 5, TIMING.scanEnd - 5, TIMING.scanEnd + 20],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  )

  return (
    <group position={[x, 0.5, 0.25]}>
      {/* Wide soft glow */}
      <mesh scale={[2.4, SCREEN_H * 1.25, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glow}
          color="#FF3B5C"
          transparent
          opacity={opacity * 0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Bright core */}
      <mesh scale={[0.07, SCREEN_H * 1.02, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#ffd9e0"
          transparent
          opacity={opacity * 0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
