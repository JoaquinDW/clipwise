import type { ReactNode } from "react"
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { COLORS, FONTS, GRADIENT_TEXT } from "../theme"

const LETTERBOX = 96

const Title = ({ kicker, children }: { kicker?: string; children: ReactNode }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 90 } })
  const exit = interpolate(frame, [durationInFrames - 18, durationInFrames - 4], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  })

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", pointerEvents: "none" }}>
      <div
        style={{
          marginLeft: 120,
          marginBottom: LETTERBOX + 64,
          maxWidth: 980,
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 38}px)`,
        }}
      >
        {kicker && (
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLORS.red,
              marginBottom: 18,
            }}
          >
            {kicker}
          </div>
        )}
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: 58,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            color: COLORS.cream,
            textShadow: "0 4px 40px rgba(0,0,0,0.8)",
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  )
}

const Outro = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logo = spring({ frame, fps, config: { damping: 14, stiffness: 80 } })
  const sub = spring({ frame: frame - 12, fps, config: { damping: 200 } })
  const cta = spring({ frame: frame - 26, fps, config: { damping: 200 } })

  const pills = ["TikTok", "YouTube Shorts", "Instagram Reels", "Twitter/X"]

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.heading,
          fontSize: 124,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          ...GRADIENT_TEXT,
          opacity: logo,
          transform: `scale(${0.85 + logo * 0.15})`,
        }}
      >
        Momentreel
      </div>
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: 27,
          color: COLORS.gray,
          marginTop: 22,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 20}px)`,
        }}
      >
        Turn your content into viral clips. Automatically.
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 34,
          opacity: sub,
        }}
      >
        {pills.map((p) => (
          <span
            key={p}
            style={{
              fontFamily: FONTS.body,
              fontSize: 15,
              color: "#999",
              border: "1px solid #2a2a2a",
              padding: "8px 20px",
              borderRadius: 100,
            }}
          >
            {p}
          </span>
        ))}
      </div>
      <div
        style={{
          marginTop: 44,
          fontFamily: FONTS.body,
          fontSize: 21,
          fontWeight: 700,
          color: "#fff",
          background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
          padding: "16px 44px",
          borderRadius: 100,
          boxShadow: "0 0 60px rgba(255,59,92,0.35)",
          opacity: cta,
          transform: `translateY(${(1 - cta) * 20}px)`,
        }}
      >
        Join the waitlist → momentreel.com
      </div>
    </AbsoluteFill>
  )
}

const Letterbox = () => {
  const frame = useCurrentFrame()
  const h = interpolate(frame, [0, 30], [0, LETTERBOX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  })
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: h, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: h, background: "#000" }} />
    </AbsoluteFill>
  )
}

const Vignette = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.55) 100%)",
    }}
  />
)

export const Overlays = () => {
  return (
    <>
      <Vignette />
      <Sequence from={22} durationInFrames={100} name="Title 1">
        <Title kicker="Momentreel">
          Your best moments are buried
          <br />
          in hours of footage.
        </Title>
      </Sequence>
      <Sequence from={142} durationInFrames={125} name="Title 2">
        <Title kicker="AI highlight detection">
          AI finds the moments
          <br />
          that go <span style={GRADIENT_TEXT}>viral</span>.
        </Title>
      </Sequence>
      <Sequence from={298} durationInFrames={138} name="Title 3">
        <Title kicker="Auto-crop + captions">
          Cropped to 9:16.
          <br />
          Captions burned in.
        </Title>
      </Sequence>
      <Sequence from={462} durationInFrames={100} name="Title 4">
        <Title kicker="No timeline. No editor.">Ready to post in minutes.</Title>
      </Sequence>
      <Sequence from={596} durationInFrames={124} name="Outro">
        <Outro />
      </Sequence>
      <Letterbox />
    </>
  )
}
