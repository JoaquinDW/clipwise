"use client"

import { useEffect, useState } from "react"
import type { Lang } from "./use-lang"

const i18n = {
  es: {
    badge: "✦ Video largo entra. Clip viral sale.",
    h1a: "Convierte tu contenido",
    h1b: "en clips",
    h1c: "virales",
    sub: "Cada episodio, stream o video largo tiene momentos virales escondidos. Momentreel los detecta, recorta a 9:16 y agrega los subtítulos — sin tocar el timeline, listo en minutos.",
    cta: "Unirme a la lista →",
    stats: [
      { value: "94%", label: "Precisión IA" },
      { value: "<5min", label: "Tiempo de proceso" },
      { value: "10x", label: "Más alcance" },
      { value: "50+", label: "Idiomas" },
    ],
  },
  en: {
    badge: "✦ Long videos in. Viral clips out.",
    h1a: "Turn your",
    h1b: "content into",
    h1c: "viral clips",
    sub: "Every podcast, stream, or video has viral moments buried inside it. Momentreel finds them, crops to 9:16, and burns captions — no timeline, no editor, done in minutes.",
    cta: "Join the waitlist →",
    stats: [
      { value: "94%", label: "AI accuracy" },
      { value: "<5min", label: "Processing time" },
      { value: "10x", label: "More reach" },
      { value: "50+", label: "Languages" },
    ],
  },
}

const pills = ["TikTok", "YouTube Shorts", "Instagram Reels", "Twitter/X", "Kick"]

function OrbBg() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "10%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,59,92,0.11) 0%, transparent 68%)",
          filter: "blur(32px)",
          animation: "pulseOrb 9s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "0%",
          right: "8%",
          width: 550,
          height: 550,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,140,0,0.09) 0%, transparent 68%)",
          filter: "blur(32px)",
          animation: "pulseOrb 11s ease-in-out infinite 4s",
        }}
      />
    </div>
  )
}

function KaraokeCaption({ text }: { text: string }) {
  const words = text.split(" ")
  // Two extra ticks create a beat of rest before the loop restarts.
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = setInterval(() => setActive((a) => (a + 1) % (words.length + 2)), 380)
    return () => clearInterval(id)
  }, [words.length])

  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span
            style={{
              background: i === active ? "linear-gradient(135deg,#FF3B5C,#FF8C00)" : "transparent",
              borderRadius: 3,
              padding: "0 3px",
              margin: "0 -3px",
              transition: "background 0.15s ease",
            }}
          >
            {w}
          </span>{" "}
        </span>
      ))}
    </>
  )
}

function StatValue({ value }: { value: string }) {
  const [display, setDisplay] = useState(() => value.replace(/\d+/, "0"))

  useEffect(() => {
    const match = value.match(/^([^\d]*)(\d+)(.*)$/)
    if (!match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value)
      return
    }
    const [, prefix, num, suffix] = match
    const target = parseInt(num, 10)
    const start = performance.now()
    const duration = 1400
    let raf: number
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(`${prefix}${Math.round(target * eased)}${suffix}`)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{display}</>
}

function Phone({
  gradient,
  caption,
  score,
  isCenter = false,
  style,
}: {
  gradient: string
  caption: string
  score: string
  isCenter?: boolean
  style?: React.CSSProperties
}) {
  const width = isCenter ? 195 : 164
  const height = isCenter ? 347 : 291

  return (
    <div
      style={{
        width,
        height,
        borderRadius: isCenter ? 26 : 22,
        border: `1.5px solid ${isCenter ? "#333" : "#1e1e1e"}`,
        background: "#0a0a0a",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        boxShadow: isCenter
          ? "0 0 80px rgba(255,59,92,0.15), 0 40px 100px rgba(0,0,0,0.8)"
          : "0 20px 60px rgba(0,0,0,0.6)",
        ...style,
      }}
    >
      {isCenter && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: 40,
            height: 12,
            background: "#000",
            borderRadius: 8,
            zIndex: 10,
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: gradient }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)",
        }}
      />
      <div
        className={score.startsWith("VIRAL") ? "viral-badge" : undefined}
        style={{
          position: "absolute",
          top: isCenter ? 32 : 12,
          left: 10,
          background: score.startsWith("VIRAL") ? "#FF3B5C" : "rgba(255,140,0,0.85)",
          color: "#fff",
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: 8,
          fontWeight: 700,
          padding: "3px 7px",
          borderRadius: 4,
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
          bottom: 18,
          left: 10,
          right: 10,
          textAlign: "center",
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontSize: isCenter ? 10.5 : 9,
            fontWeight: 700,
            color: "#fff",
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
            lineHeight: 1.45,
            display: "block",
          }}
        >
          {isCenter ? <KaraokeCaption text={caption} /> : caption}
        </span>
      </div>
    </div>
  )
}

function PhoneStack() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 8px 12px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 260,
          height: 400,
          background: "radial-gradient(ellipse, rgba(255,59,92,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div className="float-slow" style={{ zIndex: 1 }}>
        <Phone
          gradient="linear-gradient(160deg, #1a0620 0%, #33103d 45%, #110418 100%)"
          caption="The biggest mistake most creators make..."
          score="CLIP · 87%"
          style={{
            transform: "rotate(-8deg) translateX(24px) translateY(10px)",
          }}
        />
      </div>
      <Phone
        gradient="linear-gradient(160deg, #200610 0%, #3d1020 45%, #140408 100%)"
        caption="I went from 0 to 100k in 90 days"
        score="VIRAL · 94%"
        isCenter
        style={{ zIndex: 3, position: "relative" }}
      />
      <div className="float-slower" style={{ zIndex: 2 }}>
        <Phone
          gradient="linear-gradient(160deg, #0e1a06 0%, #1e3510 45%, #090e04 100%)"
          caption="This strategy changed everything for me"
          score="CLIP · 91%"
          style={{
            transform: "rotate(8deg) translateX(-24px) translateY(10px)",
          }}
        />
      </div>
    </div>
  )
}

export default function Hero({ lang }: { lang: Lang }) {
  const t = i18n[lang]
  return (
    <section
      className="section-pad"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <OrbBg />
      <div
        className="hero-grid"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div>
          <div className="fu d1">
            <span
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.16em",
                color: "#FF3B5C",
                textTransform: "uppercase",
                border: "1px solid rgba(255,59,92,0.25)",
                padding: "5px 16px",
                borderRadius: 100,
                display: "inline-block",
                marginBottom: 28,
              }}
            >
              {t.badge}
            </span>
          </div>
          <h1
            className="fu d2"
            style={{
              fontFamily: "var(--font-syne), sans-serif",
              fontWeight: 800,
              lineHeight: 1.0,
              color: "#f2ede8",
              marginBottom: 28,
              letterSpacing: "-0.03em",
              fontSize: "clamp(44px, 5.5vw, 84px)",
            }}
          >
            {t.h1a}
            <br />
            {t.h1b}
            <br />
            <span className="grad-text">{t.h1c}</span>
          </h1>
          <p
            className="fu d3"
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 18,
              lineHeight: 1.65,
              color: "#aaa",
              marginBottom: 40,
              maxWidth: 420,
            }}
          >
            {t.sub}
          </p>
          <div className="fu d4" style={{ marginBottom: 44 }}>
            <a href="#waitlist" className="cta-btn">
              {t.cta}
            </a>
          </div>
          <div className="fu d5" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pills.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 11,
                  color: "#999",
                  border: "1px solid #1e1e1e",
                  padding: "5px 13px",
                  borderRadius: 100,
                  letterSpacing: "0.02em",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="fu d3" style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 500,
              height: 400,
              background: "radial-gradient(circle, rgba(255,59,92,0.08), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <PhoneStack />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 10,
            }}
          >
            {t.stats.map((s) => (
              <div
                key={s.label}
                style={{
                  background: "#111",
                  border: "1px solid #1a1a1a",
                  borderRadius: 10,
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-syne), sans-serif",
                    fontSize: 28,
                    fontWeight: 800,
                    background: "linear-gradient(135deg,#FF3B5C,#FF8C00)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    lineHeight: 1,
                  }}
                >
                  <StatValue value={s.value} />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 12,
                    color: "#777",
                    marginTop: 4,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
