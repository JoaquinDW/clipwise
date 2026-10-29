'use client';

import type { Lang } from './use-lang';
import Reveal from './reveal';
import { AGENTS } from './hero';

// The tool names in the mock are the real ones from desktop/src/mcp/server.ts,
// in the order an agent calls them. Keep them in sync if the server renames one.
const i18n = {
  es: {
    badge: '✦ Trae tu propia IA',
    headline: 'Tu agente decide qué cortar.',
    gradPart: 'Tu Mac hace el resto.',
    sub: 'Momentreel abre un servidor MCP local. Claude, Codex o Cursor leen la transcripción con tiempos, eligen los momentos y piden los clips. Usa la IA que ya pagas: nosotros no te cobramos tokens ni créditos.',
    steps: [
      { title: 'Instala la app', desc: 'Descarga Momentreel para Mac y activa tu licencia. Transcripción y modelos se descargan una vez y quedan en tu equipo.' },
      { title: 'Conecta tu agente', desc: 'Un clic para Claude Desktop, Codex o Cursor. Para Claude Code, un comando que la app te copia.' },
      { title: 'Pídele los clips', desc: '"Sácame los 4 mejores momentos de este episodio." El agente elige y Momentreel recorta, encuadra y subtitula en local.' },
    ],
    chatUser: 'Corta los 4 mejores momentos de este episodio para TikTok: youtube.com/watch?v=…',
    chatAgent: 'Listo. Encontré 4 momentos que se entienden solos; el más fuerte es la anécdota del minuto 41. Los clips están en ~/Movies/Momentreel.',
    clipsDone: '4 clips · 9:16 · subtítulos puestos',
  },
  en: {
    badge: '✦ Bring your own AI',
    headline: 'Your agent decides what to cut.',
    gradPart: 'Your Mac does the rest.',
    sub: "Momentreel runs a local MCP server. Claude, Codex or Cursor reads the timestamped transcript, picks the moments and asks for the clips. Use the AI you already pay for: we don't charge you for tokens or credits.",
    steps: [
      { title: 'Install the app', desc: 'Download Momentreel for Mac and activate your licence. Transcription models download once and stay on your machine.' },
      { title: 'Connect your agent', desc: 'One click for Claude Desktop, Codex or Cursor. For Claude Code, one command the app copies for you.' },
      { title: 'Ask for the clips', desc: '"Pull the 4 best moments from this episode." The agent picks, and Momentreel crops, frames and captions locally.' },
    ],
    chatUser: 'Cut the 4 best moments from this episode for TikTok: youtube.com/watch?v=…',
    chatAgent: 'Done. I found 4 moments that stand on their own; the strongest is the story at minute 41. The clips are in ~/Movies/Momentreel.',
    clipsDone: '4 clips · 9:16 · captions in place',
  },
};

const toolCalls = ['import_video', 'get_transcript', 'get_candidates', 'create_clips'];

function AgentWindow({ t }: { t: (typeof i18n)['en'] }) {
  const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #1f1f1f',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,59,92,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px', borderBottom: '1px solid #1a1a1a' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
        ))}
        <span style={{ marginLeft: 10, fontFamily: mono, fontSize: 11, color: '#777' }}>agent · momentreel MCP</span>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: '#1c1c1c', borderRadius: '12px 12px 4px 12px', padding: '10px 14px', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#ddd', lineHeight: 1.5 }}>
          {t.chatUser}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {toolCalls.map((name) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: mono, fontSize: 12, color: '#9a9a9a' }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2.5 7L6 10.5L11.5 3.5" stroke="#28c840" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ color: '#FF8C00' }}>momentreel</span>
              <span>· {name}</span>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: '90%', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#c8c8c8', lineHeight: 1.6 }}>
          {t.chatAgent}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 44,
                height: 78,
                borderRadius: 6,
                border: '1px solid #262626',
                background: `linear-gradient(160deg, rgba(255,59,92,${0.22 - i * 0.04}), rgba(255,140,0,${0.12 - i * 0.02}) 60%, #111)`,
              }}
            />
          ))}
          <span style={{ alignSelf: 'flex-end', fontFamily: mono, fontSize: 11, color: '#8a8a8a', marginLeft: 6 }}>{t.clipsDone}</span>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks({ lang }: { lang: Lang }) {
  const t = i18n[lang];

  return (
    <section id="how-it-works" className="section-pad" style={{ borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 24 }}>
            {t.badge}
          </span>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
            {t.headline} <span className="grad-text">{t.gradPart}</span>
          </h2>
          <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 17, lineHeight: 1.6, color: '#aaa', maxWidth: 660, margin: '0 auto' }}>{t.sub}</p>
        </Reveal>

        <div className="grid-2col">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {t.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <div style={{ display: 'flex', gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,59,92,0.3)', background: 'rgba(255,59,92,0.06)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-syne), sans-serif', fontWeight: 800, fontSize: 15, color: '#FF3B5C' }}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 18, fontWeight: 700, color: '#f2ede8', marginBottom: 6 }}>{s.title}</h3>
                    <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 15, color: '#aaa', lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 56 }}>
              {AGENTS.map((a) => (
                <span key={a} style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#ccc', border: '1px solid #262626', background: '#111', padding: '6px 14px', borderRadius: 100 }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
          <Reveal delay={0.1}>
            <AgentWindow t={t} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
