import * as THREE from "three"

export const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(" ")
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export type CardSpec = {
  colors: [string, string, string]
  caption: string
  score: string
  viral: boolean
  isCenter: boolean
}

/** Renders a 9:16 phone-style clip card (gradient bg, score badge, burned-in caption). */
export const createCardTexture = (spec: CardSpec): THREE.CanvasTexture => {
  const w = 540
  const h = 960
  const r = 52
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!

  ctx.clearRect(0, 0, w, h)
  roundRect(ctx, 0, 0, w, h, r)
  ctx.save()
  ctx.clip()

  // 160deg-ish gradient background (matches landing-page phones)
  const g = ctx.createLinearGradient(w * 0.15, 0, w * 0.85, h)
  g.addColorStop(0, spec.colors[0])
  g.addColorStop(0.45, spec.colors[1])
  g.addColorStop(1, spec.colors[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // Top sheen so the dark gradients read as a lit screen
  const sheen = ctx.createLinearGradient(0, 0, 0, h * 0.55)
  sheen.addColorStop(0, "rgba(255,255,255,0.09)")
  sheen.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, w, h * 0.55)

  // Vignette
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, h * 0.75)
  v.addColorStop(0, "rgba(0,0,0,0)")
  v.addColorStop(1, "rgba(0,0,0,0.45)")
  ctx.fillStyle = v
  ctx.fillRect(0, 0, w, h)

  // Bottom caption gradient
  const b = ctx.createLinearGradient(0, h, 0, h * 0.5)
  b.addColorStop(0, "rgba(0,0,0,0.95)")
  b.addColorStop(0.6, "rgba(0,0,0,0.4)")
  b.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = b
  ctx.fillRect(0, h * 0.5, w, h * 0.5)

  // Notch (center phone only)
  if (spec.isCenter) {
    ctx.fillStyle = "#000"
    roundRect(ctx, w / 2 - 55, 26, 110, 30, 15)
    ctx.fill()
  }

  // Score badge
  const badgeY = spec.isCenter ? 86 : 42
  ctx.font = '700 23px "DM Sans", sans-serif'
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  const tw = ctx.measureText(spec.score).width
  ctx.fillStyle = spec.viral ? "#FF3B5C" : "rgba(255,140,0,0.92)"
  roundRect(ctx, 30, badgeY, tw + 38, 46, 10)
  ctx.fill()
  ctx.fillStyle = "#fff"
  ctx.fillText(spec.score, 49, badgeY + 25)

  // Burned-in caption
  ctx.font = '700 36px "DM Sans", sans-serif'
  ctx.textAlign = "center"
  ctx.shadowColor = "rgba(0,0,0,0.9)"
  ctx.shadowBlur = 14
  const lines = wrapText(ctx, spec.caption, w - 90)
  const lineHeight = 48
  const startY = h - 64 - (lines.length - 1) * lineHeight
  ctx.fillStyle = "#fff"
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, startY + i * lineHeight)
  })
  ctx.shadowBlur = 0
  ctx.restore()

  // Border
  ctx.strokeStyle = spec.isCenter ? "#3d3d3d" : "#242424"
  ctx.lineWidth = 4
  roundRect(ctx, 2, 2, w - 4, h - 4, r - 2)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Soft radial glow used for light bloom sprites (tinted via material color). */
export const createGlowTexture = (): THREE.CanvasTexture => {
  const s = 256
  const canvas = document.createElement("canvas")
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext("2d")!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, "rgba(255,255,255,0.85)")
  g.addColorStop(0.35, "rgba(255,255,255,0.25)")
  g.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
