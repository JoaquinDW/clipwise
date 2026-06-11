import { loadFont as loadSyne } from "@remotion/google-fonts/Syne"
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans"

const syne = loadSyne("normal", { weights: ["700", "800"] })
const dmSans = loadDMSans("normal", { weights: ["400", "500", "700"] })

export const FONTS = {
  heading: syne.fontFamily,
  body: dmSans.fontFamily,
}

export const COLORS = {
  bg: "#050505",
  red: "#FF3B5C",
  orange: "#FF8C00",
  cream: "#f2ede8",
  gray: "#aaaaaa",
}

export const GRADIENT_TEXT: React.CSSProperties = {
  background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
}

export const FPS = 30
export const DURATION_IN_FRAMES = 720 // 24s

// Scene timing (frames)
export const TIMING = {
  // Scan beam sweeps the master screen
  scanStart: 135,
  scanEnd: 225,
  // Master screen recedes, vertical clips fly out
  splitStart: 280,
  // Camera orbit
  orbitStart: 450,
  orbitEnd: 570,
  // Outro
  cardsFadeStart: 575,
  cardsFadeEnd: 645,
}

// Highlight positions (0..1 along the footage timeline)
export const HIGHLIGHTS = [
  { at: 0.22, score: "87%" },
  { at: 0.52, score: "94%" },
  { at: 0.78, score: "91%" },
]
