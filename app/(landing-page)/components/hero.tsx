"use client"

import { useEffect, useState } from "react"
import type { Lang } from "./use-lang"
import { HERO_CLIP, HERO_STILLS } from "./clip-assets"
import { useAutoplayOnView } from "./use-autoplay-on-view"

const i18n = {
  es: {
    badge: "✦ Video largo entra. Clip viral sale.",
    h1a: "Convierte tu contenido",
    h1b: "en clips",
    h1c: "virales",
    sub: "Cada episodio, stream o video largo tiene momentos virales escondidos. Momentreel los detecta, recorta a 9:16 y agrega los subtítulos — sin tocar el timeline, listo en minutos.",
    cta: "Empezar gratis →",
    stats: [
      { value: "94%", label: "Precisión de transcripción" },
      { value: "<5min", label: "Hasta el primer clip" },
      { value: "10", label: "Clips por video" },
      { value: "50+", label: "Idiomas" },
    ],
    clipAlt: "Un clip real de Momentreel: recorte vertical con subtítulos automáticos",
    stillAlt: "Fotograma de un clip generado por Momentreel",
    play: "Reproducir el clip de ejemplo",
  },
  en: {
    badge: "✦ Long videos in. Viral clips out.",
    h1a: "Turn your",
    h1b: "content into",
    h1c: "viral clips",
    sub: "Every podcast, stream, or video has viral moments buried inside it. Momentreel finds them, crops to 9:16, and burns captions — no timeline, no editor, done in minutes.",
    cta: "Start free trial →",
    stats: [
      { value: "94%", label: "Transcription accuracy" },
      { value: "<5min", label: "Time to first clip" },
      { value: "10", label: "Clips per video" },
      { value: "50+", label: "Languages" },
    ],
    clipAlt: "A real Momentreel clip: vertical crop with auto captions",
    stillAlt: "A frame from a clip Momentreel generated",
    play: "Play the sample clip",
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

/**
 * The real product output, looping in the hero.
 *
 * Bytes are deferred behind `preload="none"` so the poster is what paints for
 * LCP; playback only starts once the clip is actually on screen. Three things
 * can veto autoplay — being off screen, reduced-motion, and Data Saver — and in
 * every one of those cases the poster stays put behind a real play button
 * rather than the section going blank.
 */
function ClipVideo({ label, playLabel }: { label: string; playLabel: string }) {
  const { videoRef, manual, playing, play, handlers } = useAutoplayOnView()

  return (
    <>
      <video
        ref={videoRef}
        poster={HERO_CLIP.poster}
        preload="none"
        muted
        loop
        playsInline
        disablePictureInPicture
        width={HERO_CLIP.width}
        height={HERO_CLIP.height}
        aria-label={label}
        {...handlers}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      >
        <source src={HERO_CLIP.mp4} type="video/mp4" />
      </video>
      {manual && !playing && <PlayOverlay label={playLabel} onClick={play} />}
    </>
  )
}

/** Shown only when autoplay was vetoed. 52px keeps it over the 44px minimum. */
export function PlayOverlay({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%,-50%)",
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(10,10,10,0.72)",
        backdropFilter: "blur(8px)",
        color: "#f2ede8",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        zIndex: 6,
        padding: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>
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

type PhoneMedia =
  | { kind: "video"; label: string; playLabel: string }
  | { kind: "still"; src: string; alt: string }

function Phone({
  media,
  score,
  isCenter = false,
  badgeAlign = "left",
  style,
}: {
  media: PhoneMedia
  score: string
  isCenter?: boolean
  /** The flanking phones tuck under the center one, so their badge has to sit
   *  on the outward edge or it disappears behind it. */
  badgeAlign?: "left" | "right"
  style?: React.CSSProperties
}) {
  // The center phone carries the playing clip, so it is sized for the burned
  // captions to read as captions rather than as texture.
  const width = isCenter ? 260 : 164
  const height = isCenter ? 462 : 291

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
      <div style={{ position: "absolute", inset: 0 }}>
        {media.kind === "video" ? (
          <ClipVideo label={media.label} playLabel={media.playLabel} />
        ) : (
          <img
            src={media.src}
            alt={media.alt}
            width={HERO_STILLS.width}
            height={HERO_STILLS.height}
            loading="lazy"
            decoding="async"
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.35) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        className={score.startsWith("VIRAL") ? "viral-badge" : undefined}
        style={{
          position: "absolute",
          top: isCenter ? 32 : 12,
          [badgeAlign]: 10,
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
      {/* Nothing over the bottom of the frame. The pipeline burns the captions
          in low, with their own highlight, and that is precisely what this
          section exists to show — any scrim here dims the payload. */}
    </div>
  )
}

function PhoneStack({ t }: { t: (typeof i18n)["en"] }) {
  return (
    <div
      className="phone-stack-wrapper"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // No horizontal padding: the 588px stack already fills the hero column
        // at 1024px, and any extra would clip the outer badges.
        padding: "32px 0 12px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 340,
          height: 520,
          background: "radial-gradient(ellipse, rgba(255,59,92,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* The two stills are different speakers from the same source — side by
          side they show the automatic speaker tracking without a word of copy. */}
      <div className="float-slow phone-side" style={{ zIndex: 1 }}>
        <Phone
          media={{ kind: "still", src: HERO_STILLS.left, alt: t.stillAlt }}
          score="CLIP · 87%"
          style={{
            transform: "rotate(-8deg) translateX(36px) translateY(10px)",
          }}
        />
      </div>
      <Phone
        media={{ kind: "video", label: t.clipAlt, playLabel: t.play }}
        score="VIRAL · 94%"
        isCenter
        style={{ zIndex: 3, position: "relative" }}
      />
      <div className="float-slower phone-side" style={{ zIndex: 2 }}>
        <Phone
          media={{ kind: "still", src: HERO_STILLS.right, alt: t.stillAlt }}
          score="CLIP · 91%"
          badgeAlign="right"
          style={{
            transform: "rotate(8deg) translateX(-36px) translateY(10px)",
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
            <a href="/login" className="cta-btn">
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
        <div className="fu d3" style={{ position: "relative", overflow: "hidden" }}>
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
          <PhoneStack t={t} />
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
                    // #777 on #111 is ~4.0:1 and fails AA for small text.
                    color: "#9a9a9a",
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
