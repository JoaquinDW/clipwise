"use client"

import { useState, useEffect } from "react"
import type { Lang } from "./use-lang"
import Reveal from "./reveal"

const i18n = {
  es: {
    badge: "✦ Cómo funciona",
    headline: "En 4 pasos,",
    gradPart: "listo para publicar",
    steps: [
      {
        n: "01",
        title: "Sube tu video",
        desc: "Pega un enlace de YouTube o sube un archivo MP4. Máx. 500 MB.",
      },
      {
        n: "02",
        title: "IA transcribe y analiza",
        desc: "Cada palabra, con timestamps exactos. La IA detecta los momentos con más potencial viral.",
      },
      {
        n: "03",
        title: "Clips generados",
        desc: "Recortados a 9:16, encuadrados de forma inteligente y con subtítulos quemados — sin tocar nada.",
      },
      {
        n: "04",
        title: "Descarga y publica",
        desc: "Clips listos para TikTok, Shorts y Reels. Un clic para descargar todos.",
      },
    ],
    cta: "Probarlo gratis →",
  },
  en: {
    badge: "✦ How it works",
    headline: "In 4 steps,",
    gradPart: "ready to publish",
    steps: [
      {
        n: "01",
        title: "Upload your video",
        desc: "Paste a YouTube link or upload an MP4 file.",
      },
      {
        n: "02",
        title: "AI transcribes & analyzes",
        desc: "Every word, with precise timestamps. AI spots the moments with the highest viral potential.",
      },
      {
        n: "03",
        title: "Clips generated",
        desc: "Trimmed to 9:16, intelligently framed, and captions burned in — no editing needed.",
      },
      {
        n: "04",
        title: "Download & publish",
        desc: "Clips ready for TikTok, Shorts, and Reels. One click to download all.",
      },
    ],
    cta: "Try it free →",
  },
}

function MiniPhone({ gradient, score }: { gradient: string; score: string }) {
  return (
    <div
      style={{
        width: 86,
        height: 153,
        borderRadius: 12,
        border: "1px solid #2a2a2a",
        background: "#0a0a0a",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: gradient }} />
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          background: "#FF3B5C",
          color: "#fff",
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: 8,
          fontWeight: 700,
          padding: "1px 5px",
          borderRadius: 3,
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
          height: "40%",
          background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
        }}
      />
    </div>
  )
}

function PhaseInput({ lang }: { lang: Lang }) {
  return (
    <div style={{ textAlign: "center", width: "100%" }}>
      <div
        style={{
          width: 72,
          height: 72,
          margin: "0 auto 20px",
          background: "rgba(255,59,92,0.06)",
          border: "1px solid rgba(255,59,92,0.15)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="#FF3B5C" strokeWidth="1.5" />
          <path d="M10 8l5 3-5 3V8z" fill="#FF3B5C" />
          <path d="M8 21h8M12 17v4" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div
        style={{
          fontFamily: "var(--font-syne), sans-serif",
          fontSize: 14,
          fontWeight: 700,
          color: "#f2ede8",
          marginBottom: 10,
        }}
      >
        Episode 47 — Build an Audience.mp4
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        {[["Duration", "2:14:33"], ["Size", "847 MB"], ["Format", "MP4"]].map(
          ([k, v]) => (
            <div
              key={k}
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 12,
              }}
            >
              <span style={{ color: "#444" }}>{k}: </span>
              <span style={{ color: "#888" }}>{v}</span>
            </div>
          )
        )}
      </div>
      <div
        style={{
          height: 4,
          background: "#1a1a1a",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, #FF3B5C, #FF8C00)",
            borderRadius: 4,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: 11,
          color: "#FF3B5C",
          marginTop: 8,
        }}
      >
        ✓ {lang === "es" ? "Video subido correctamente" : "Video uploaded successfully"}
      </div>
    </div>
  )
}

function PhaseProcessing({ lang }: { lang: Lang }) {
  const logsEs = [
    { done: true, text: "Transcripción completada · 5,234 palabras" },
    { done: true, text: "Analizando momentos virales..." },
    { done: false, text: "Detectando estrategia de recorte..." },
    { done: false, text: "Generando clips 9:16..." },
  ]
  const logsEn = [
    { done: true, text: "Transcription complete · 5,234 words" },
    { done: true, text: "Analyzing viral moments..." },
    { done: false, text: "Detecting crop strategy..." },
    { done: false, text: "Generating 9:16 clips..." },
  ]
  const logs = lang === "es" ? logsEs : logsEn

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {logs.map((log, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 13,
            }}
          >
            <span style={{ color: log.done ? "#28c840" : "#FF8C00", fontSize: 15, lineHeight: 1 }}>
              {log.done ? "✓" : "⟳"}
            </span>
            <span style={{ color: log.done ? "#666" : "#f2ede8" }}>{log.text}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 28,
          height: 4,
          background: "#1a1a1a",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "68%",
            height: "100%",
            background: "linear-gradient(90deg, #FF3B5C, #FF8C00)",
            borderRadius: 4,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: 11,
          color: "#555",
          marginTop: 8,
        }}
      >
        68% — {lang === "es" ? "procesando..." : "processing..."}
      </div>
    </div>
  )
}

function PhaseOutput({ lang }: { lang: Lang }) {
  const phones = [
    { gradient: "linear-gradient(160deg, #200610 0%, #3d1020 100%)", score: "94%" },
    { gradient: "linear-gradient(160deg, #1a0620 0%, #33103d 100%)", score: "91%" },
    { gradient: "linear-gradient(160deg, #0e1a06 0%, #1e3510 100%)", score: "87%" },
    { gradient: "linear-gradient(160deg, #0d1520 0%, #153040 100%)", score: "83%" },
  ]

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: 12,
          color: "#28c840",
          marginBottom: 20,
          letterSpacing: "0.04em",
        }}
      >
        ✓{" "}
        {lang === "es"
          ? "4 clips generados · listos para publicar"
          : "4 clips generated · ready to publish"}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
        {phones.map((p, i) => (
          <MiniPhone key={i} gradient={p.gradient} score={p.score} />
        ))}
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: 12,
          color: "#FF3B5C",
          border: "1px solid rgba(255,59,92,0.25)",
          padding: "8px 18px",
          borderRadius: 8,
          cursor: "default",
          letterSpacing: "0.02em",
        }}
      >
        ↓ {lang === "es" ? "Descargar los 4 clips" : "Download all 4 clips"}
      </div>
    </div>
  )
}

function ProcessFlow({ lang }: { lang: Lang }) {
  const [phase, setPhase] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const interval = setInterval(() => {
      setVisible(false)
      timeout = setTimeout(() => {
        setPhase((p) => (p + 1) % 3)
        setVisible(true)
      }, 400)
    }, 3500)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div
      style={{
        background: "#0d0d0d",
        border: "1px solid #1a1a1a",
        borderRadius: 16,
        overflow: "hidden",
        minHeight: 440,
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          background: "#0a0a0a",
          borderBottom: "1px solid #151515",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {["#ff5f57", "#ffbd2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
        ))}
        <span
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontSize: 11,
            color: "#333",
            marginLeft: 8,
            letterSpacing: "0.04em",
          }}
        >
          momentreel · processing
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: phase === i ? "#FF3B5C" : "#222",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          transition: "opacity 0.4s ease",
          opacity: visible ? 1 : 0,
        }}
      >
        {phase === 0 && <PhaseInput lang={lang} />}
        {phase === 1 && <PhaseProcessing lang={lang} />}
        {phase === 2 && <PhaseOutput lang={lang} />}
      </div>
    </div>
  )
}

export default function Demo({ lang }: { lang: Lang }) {
  const t = i18n[lang]

  return (
    <section
      id="demo"
      className="section-pad"
      style={{ borderTop: "1px solid #111", position: "relative" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
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
                marginBottom: 24,
              }}
            >
              {t.badge}
            </span>
            <h2
              style={{
                fontFamily: "var(--font-syne), sans-serif",
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 800,
                color: "#f2ede8",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {t.headline} <span className="grad-text">{t.gradPart}</span>
            </h2>
          </div>
        </Reveal>
        <div className="grid-2col">
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {t.steps.map((s, i) => (
              <Reveal
                key={s.n}
                delay={i * 0.1}
                style={{ display: "flex", gap: 20, alignItems: "flex-start" }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(255,59,92,0.08)",
                    border: "1px solid rgba(255,59,92,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-syne), sans-serif",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#FF3B5C",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {s.n}
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-syne), sans-serif",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#f2ede8",
                      marginBottom: 6,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 14,
                      color: "#aaa",
                      lineHeight: 1.6,
                    }}
                  >
                    {s.desc}
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.4} style={{ marginTop: 8 }}>
              <a href="#waitlist" className="cta-btn">
                {t.cta}
              </a>
            </Reveal>
          </div>
          <Reveal delay={0.2}>
            <ProcessFlow lang={lang} />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
