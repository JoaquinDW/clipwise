import React from "react"
import { AbsoluteFill } from "remotion"
import { COLORS, FONTS } from "../theme"
import { GradText, LogoFull, LogoMark, Orbs, PhoneStack, Pill } from "./Logo"

const Canvas: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: COLORS.bg }}>
    <Orbs />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
)

// 1000x1000 — profile picture for X / Reddit / IG / TikTok / LinkedIn
export const Avatar: React.FC = () => (
  <AbsoluteFill style={{ background: "#0A0A0A" }}>
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 42%, rgba(255,59,92,0.20) 0%, transparent 65%)",
      }}
    />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <LogoMark size={760} />
    </AbsoluteFill>
  </AbsoluteFill>
)

// 1500x500 — X profile header (keep bottom-left clear: avatar overlaps there)
export const BannerX: React.FC = () => (
  <Canvas>
    <div style={{ display: "flex", alignItems: "center", gap: 90, paddingLeft: 60 }}>
      <div>
        <LogoFull markSize={88} fontSize={62} />
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 27,
            color: COLORS.gray,
            marginTop: 22,
            marginLeft: 8,
            lineHeight: 1.5,
          }}
        >
          Long videos in. <GradText style={{ fontWeight: 700 }}>Viral clips out.</GradText>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 26, marginLeft: 8 }}>
          {["TikTok", "YouTube Shorts", "Instagram Reels"].map((p) => (
            <Pill key={p} fontSize={15}>
              {p}
            </Pill>
          ))}
        </div>
      </div>
      <PhoneStack scale={0.78} />
    </div>
  </Canvas>
)

// 1920x576 — Reddit community / profile banner
export const BannerReddit: React.FC = () => (
  <Canvas>
    <div style={{ display: "flex", alignItems: "center", gap: 110 }}>
      <div>
        <LogoFull markSize={104} fontSize={74} />
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 31,
            color: COLORS.gray,
            marginTop: 24,
            marginLeft: 10,
            lineHeight: 1.5,
          }}
        >
          AI finds the viral moments in your videos.
          <br />
          Cropped to 9:16, captioned, <GradText style={{ fontWeight: 700 }}>done in minutes.</GradText>
        </div>
      </div>
      <PhoneStack scale={0.92} />
    </div>
  </Canvas>
)

// 1200x630 — Open Graph / link preview (X, Reddit, LinkedIn, WhatsApp, Discord)
export const OgImage: React.FC = () => (
  <Canvas>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 36,
      }}
    >
      <LogoFull markSize={76} fontSize={52} />
      <h1
        style={{
          fontFamily: FONTS.heading,
          fontWeight: 800,
          fontSize: 76,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          color: COLORS.cream,
          margin: 0,
        }}
      >
        Turn your content
        <br />
        into <GradText>viral clips</GradText>
      </h1>
      <div style={{ fontFamily: FONTS.body, fontSize: 27, color: COLORS.gray }}>
        AI highlight detection · 9:16 smart crop · burned-in captions
      </div>
    </div>
  </Canvas>
)

// 1080x1080 — square launch / announcement card (X, IG, LinkedIn)
export const PostSquare: React.FC = () => (
  <Canvas>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 44,
      }}
    >
      <h1
        style={{
          fontFamily: FONTS.heading,
          fontWeight: 800,
          fontSize: 78,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          color: COLORS.cream,
          margin: 0,
        }}
      >
        Every video hides
        <br />
        <GradText>viral moments.</GradText>
      </h1>
      <PhoneStack scale={1.04} />
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: 30,
          color: COLORS.gray,
        }}
      >
        Momentreel finds them — <span style={{ color: COLORS.cream, fontWeight: 700 }}>momentreel.com</span>
      </div>
    </div>
  </Canvas>
)

// 1080x1920 — story / vertical share (IG Stories, TikTok, Shorts thumbnail)
export const PostStory: React.FC = () => (
  <Canvas>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 70,
      }}
    >
      <LogoFull markSize={92} fontSize={62} />
      <h1
        style={{
          fontFamily: FONTS.heading,
          fontWeight: 800,
          fontSize: 92,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          color: COLORS.cream,
          margin: 0,
        }}
      >
        Turn your
        <br />
        content into
        <br />
        <GradText>viral clips</GradText>
      </h1>
      <PhoneStack scale={1.35} />
      <div
        style={{
          marginTop: 30,
          fontFamily: FONTS.body,
          fontSize: 34,
          fontWeight: 700,
          color: "#fff",
          background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
          padding: "24px 60px",
          borderRadius: 100,
        }}
      >
        Join the waitlist → momentreel.com
      </div>
    </div>
  </Canvas>
)
