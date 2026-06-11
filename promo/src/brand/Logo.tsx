import React from "react"
import { COLORS, FONTS } from "../theme"

export const LogoMark: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none">
    <defs>
      <linearGradient id="mr-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={COLORS.red} />
        <stop offset="1" stopColor={COLORS.orange} />
      </linearGradient>
    </defs>
    <rect
      x="98" y="146" width="148" height="252" rx="34"
      stroke="url(#mr-g)" strokeWidth="12" opacity="0.32"
      transform="rotate(-8 172 272)"
    />
    <rect
      x="266" y="146" width="148" height="252" rx="34"
      stroke="url(#mr-g)" strokeWidth="12" opacity="0.32"
      transform="rotate(8 340 272)"
    />
    <rect x="166" y="86" width="180" height="320" rx="40" fill="url(#mr-g)" />
    <path
      d="M240 212 L292 246 L240 280 Z"
      fill="#fff" stroke="#fff" strokeWidth="22" strokeLinejoin="round"
    />
    <path
      d="M388 56 L400 92 L436 104 L400 116 L388 152 L376 116 L340 104 L376 92 Z"
      fill={COLORS.cream}
    />
  </svg>
)

export const LogoFull: React.FC<{ markSize?: number; fontSize?: number }> = ({
  markSize = 96,
  fontSize = 64,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: markSize * 0.14 }}>
    <LogoMark size={markSize} />
    <span
      style={{
        fontFamily: FONTS.heading,
        fontWeight: 800,
        fontSize,
        letterSpacing: "-0.02em",
        color: COLORS.cream,
        lineHeight: 1,
      }}
    >
      Momentreel
    </span>
  </div>
)

export const GradText: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span
    style={{
      background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      ...style,
    }}
  >
    {children}
  </span>
)

export const Orbs: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        top: "-20%",
        left: "5%",
        width: "55%",
        aspectRatio: "1",
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,59,92,0.14) 0%, transparent 68%)`,
        filter: "blur(40px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: "-25%",
        right: "0%",
        width: "45%",
        aspectRatio: "1",
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,140,0,0.11) 0%, transparent 68%)`,
        filter: "blur(40px)",
      }}
    />
  </div>
)

export const MiniPhone: React.FC<{
  gradient: string
  caption: string
  score: string
  width?: number
  isCenter?: boolean
  style?: React.CSSProperties
}> = ({ gradient, caption, score, width = 190, isCenter = false, style }) => {
  const height = width * 1.78
  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.13,
        border: `2px solid ${isCenter ? "#3a3a3a" : "#1e1e1e"}`,
        background: "#0a0a0a",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        boxShadow: isCenter
          ? "0 0 90px rgba(255,59,92,0.22), 0 40px 100px rgba(0,0,0,0.8)"
          : "0 20px 60px rgba(0,0,0,0.6)",
        ...style,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: gradient }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: width * 0.08,
          left: width * 0.06,
          background: score.startsWith("VIRAL") ? COLORS.red : "rgba(255,140,0,0.9)",
          color: "#fff",
          fontFamily: FONTS.body,
          fontSize: width * 0.055,
          fontWeight: 700,
          padding: `${width * 0.018}px ${width * 0.045}px`,
          borderRadius: width * 0.025,
          letterSpacing: "0.06em",
          zIndex: 5,
        }}
      >
        {score}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          zIndex: 4,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: width * 0.1,
          left: width * 0.07,
          right: width * 0.07,
          textAlign: "center",
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.body,
            fontSize: width * 0.062,
            fontWeight: 700,
            color: "#fff",
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
            lineHeight: 1.45,
            display: "block",
          }}
        >
          {caption}
        </span>
      </div>
    </div>
  )
}

export const PhoneStack: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      transform: `scale(${scale})`,
    }}
  >
    <MiniPhone
      gradient="linear-gradient(160deg, #1a0620 0%, #33103d 45%, #110418 100%)"
      caption="The biggest mistake most creators make..."
      score="CLIP · 87%"
      width={170}
      style={{ transform: "rotate(-8deg) translateX(26px) translateY(12px)", zIndex: 1 }}
    />
    <MiniPhone
      gradient="linear-gradient(160deg, #200610 0%, #3d1020 45%, #140408 100%)"
      caption="I went from 0 to 100k in 90 days"
      score="VIRAL · 94%"
      width={205}
      isCenter
      style={{ zIndex: 3, position: "relative" }}
    />
    <MiniPhone
      gradient="linear-gradient(160deg, #0e1a06 0%, #1e3510 45%, #090e04 100%)"
      caption="This strategy changed everything for me"
      score="CLIP · 91%"
      width={170}
      style={{ transform: "rotate(8deg) translateX(-26px) translateY(12px)", zIndex: 2 }}
    />
  </div>
)

export const Pill: React.FC<{ children: React.ReactNode; fontSize?: number }> = ({
  children,
  fontSize = 15,
}) => (
  <span
    style={{
      fontFamily: FONTS.body,
      fontSize,
      color: "#999",
      border: "1px solid #2a2a2a",
      padding: `${fontSize * 0.45}px ${fontSize * 1.1}px`,
      borderRadius: 100,
      letterSpacing: "0.02em",
    }}
  >
    {children}
  </span>
)
