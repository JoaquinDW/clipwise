"use client"

import { useEffect, useState } from "react"
import type { Lang } from "./use-lang"
import { HERO_CLIP, HERO_STILLS } from "./clip-assets"
import { useAutoplayOnView } from "./use-autoplay-on-view"
import { DOWNLOADS } from "@/lib/downloads"

const i18n = {
  es: {
    badge: "✦ Nuevo · Momentreel para Mac",
    h1a: "Tus mejores clips,",
    h1b: "cortados en tu Mac.",
    h1c: "Elegidos por tu IA.",
    sub: "Pega un link o arrastra un video. Momentreel transcribe y corta en tu computadora, y Claude, Codex o Cursor deciden qué momentos merecen ser clip. Sin subir nada, sin créditos, sin suscripción.",
    cta: (price: number) => `Comprar lifetime · $${price}`,
    download: "Descargar para Mac",
    platforms: "macOS · Apple Silicon e Intel — Windows muy pronto",
    worksWith: "Funciona con",
    // Cada número es verificable: el video se procesa en local (lib/video +
    // whisper.cpp), nada dibuja un watermark, el fetch a 1440p y un pago único.
    stats: [
      { value: "0", label: "Videos subidos a un servidor" },
      { value: "0", label: "Marcas de agua" },
      { value: "1440p", label: "Fuente antes del recorte" },
      { value: "1", label: "Pago, todas las versiones" },
    ],
    clipAlt: "Un clip real de Momentreel: recorte vertical con subtítulos automáticos",
    stillAlt: "Fotograma de un clip generado por Momentreel",
    play: "Reproducir el clip de ejemplo",
  },
  en: {
    badge: "✦ New · Momentreel for Mac",
    h1a: "Your best moments,",
    h1b: "cut on your Mac.",
    h1c: "Picked by your AI.",
    sub: "Paste a link or drop a video. Momentreel transcribes and cuts on your computer, and Claude, Codex or Cursor decides which moments deserve to be a clip. Nothing uploaded, no credits, no subscription.",
    cta: (price: number) => `Get lifetime · $${price}`,
    download: "Download for Mac",
    platforms: "macOS · Apple Silicon & Intel — Windows coming soon",
    worksWith: "Works with",
    stats: [
      { value: "0", label: "Videos uploaded to a server" },
      { value: "0", label: "Watermarks" },
      { value: "1440p", label: "Source before the crop" },
      { value: "1", label: "Payment, every version" },
    ],
    clipAlt: "A real Momentreel clip: vertical crop with auto captions",
    stillAlt: "A frame from a clip Momentreel generated",
    play: "Play the sample clip",
  },
}

export const AGENTS = ["Claude Desktop", "Claude Code", "Codex", "Cursor"]

export function AppleGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M16.37 12.6c-.02-2.1 1.72-3.12 1.8-3.17-.98-1.43-2.5-1.63-3.05-1.65-1.3-.13-2.53.76-3.19.76-.66 0-1.67-.74-2.75-.72-1.41.02-2.72.82-3.45 2.09-1.47 2.55-.38 6.33 1.06 8.4.7 1.01 1.53 2.15 2.62 2.11 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.05.8-1.17 1.13-2.3 1.15-2.36-.03-.01-2.2-.85-2.22-3.37zM14.3 6.43c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.62-.88 2.57.93.07 1.88-.47 2.46-1.17z" />
    </svg>
  )
}

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

/**
 * Counts up to a stat, but only where counting means anything.
 *
 * `count` is opt-in per stat because the animation is actively misleading on a
 * spec: "1440p" ticking upward renders "977p" on the way, which reads as a
 * resolution we don't offer. A quantity may climb; a measurement may not.
 */
function StatValue({ value, count = false }: { value: string; count?: boolean }) {
  const [display, setDisplay] = useState(() => (count ? value.replace(/\d+/, "0") : value))

  useEffect(() => {
    const match = value.match(/^([^\d]*)(\d+)(.*)$/)
    if (!count || !match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
  }, [value, count])

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
        // The centre phone is the one carrying the top-scoring clip, so it is
        // also the one that pulses — no need to sniff the label for a keyword.
        className={isCenter ? "viral-badge" : undefined}
        style={{
          position: "absolute",
          top: isCenter ? 32 : 12,
          [badgeAlign]: 10,
          background: isCenter ? "#FF3B5C" : "rgba(255,140,0,0.85)",
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
        score="TOP · 94%"
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

export default function Hero({ lang, priceUsd }: { lang: Lang; priceUsd: number }) {
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
                // The root wrapper is overflow-hidden, so anything wider than
                // the viewport is silently clipped rather than scrolled. This
                // eyebrow is long enough to hit that at 375px.
                maxWidth: "100%",
                lineHeight: 1.5,
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
              // Three lines of ~18 characters, each meant to stay on one line.
              // Syne 800 runs about 0.76em per character, so 42px is the largest
              // size that fits the hero column; above it every line wraps and
              // the headline reads as six ragged lines.
              fontSize: "clamp(30px, 3vw, 42px)",
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
          <div className="fu d4" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <a href="#pricing" className="cta-btn">
              {t.cta(priceUsd)} →
            </a>
            <a href={DOWNLOADS.mac.url ?? "#pricing"} className="cta-ghost">
              <AppleGlyph />
              {t.download}
            </a>
          </div>
          <p
            className="fu d4"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 12, color: "#8a8a8a", marginBottom: 40 }}
          >
            {t.platforms}
          </p>
          <div className="fu d5" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 11, color: "#8a8a8a", marginRight: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {t.worksWith}
            </span>
            {AGENTS.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 11,
                  color: "#bbb",
                  border: "1px solid #242424",
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
