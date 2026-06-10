'use client';

import type { Lang } from './use-lang';

const i18n = {
  es: {
    badge: '✦ Cómo funciona',
    headline: 'En 4 pasos,',
    gradPart: 'listo para publicar',
    steps: [
      { n: '01', title: 'Sube tu video', desc: 'Pega un enlace de YouTube o sube un archivo MP4. Máx. 500 MB.' },
      { n: '02', title: 'IA transcribe y analiza', desc: 'Cada palabra, con timestamps exactos. La IA detecta los momentos con más potencial viral.' },
      { n: '03', title: 'Clips generados', desc: 'Recortados a 9:16, encuadrados de forma inteligente y con subtítulos quemados — sin tocar nada.' },
      { n: '04', title: 'Descarga y publica', desc: 'Clips listos para TikTok, Shorts y Reels. Un clic para descargar todos.' },
    ],
    cta: 'Probarlo gratis →',
    editorLabel: '4 clips detectados',
  },
  en: {
    badge: '✦ How it works',
    headline: 'In 4 steps,',
    gradPart: 'ready to publish',
    steps: [
      { n: '01', title: 'Upload your video', desc: 'Paste a YouTube link or upload an MP4 file. Max 500 MB.' },
      { n: '02', title: 'AI transcribes & analyzes', desc: 'Every word, with precise timestamps. AI spots the moments with the highest viral potential.' },
      { n: '03', title: 'Clips generated', desc: 'Trimmed to 9:16, intelligently framed, and captions burned in — no editing needed.' },
      { n: '04', title: 'Download & publish', desc: 'Clips ready for TikTok, Shorts, and Reels. One click to download all.' },
    ],
    cta: 'Try it free →',
    editorLabel: '4 clips detected',
  },
};

function MiniEditor({ label }: { label: string }) {
  const segments = [
    { left: '4%', width: '17%', color: '#FF3B5C', opacity: 1 },
    { left: '27%', width: '13%', color: '#FF8C00', opacity: 0.55 },
    { left: '47%', width: '21%', color: '#FF3B5C', opacity: 0.55 },
    { left: '75%', width: '14%', color: '#FF8C00', opacity: 0.55 },
  ];

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
      <div style={{ padding: '10px 16px', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 6 }}>
        {['#ff5f57', '#ffbd2e', '#28c840'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, color: '#333', marginLeft: 8, letterSpacing: '0.04em' }}>momentreel · editor</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 9, color: '#FF3B5C', background: 'rgba(255,59,92,0.08)', padding: '2px 8px', borderRadius: 3 }}>{label}</span>
      </div>
      <div style={{ background: 'repeating-linear-gradient(45deg,#181818 0,#181818 8px,#111 8px,#111 16px)', aspectRatio: '16/9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(8,8,8,0.75))' }} />
        <div style={{ position: 'relative', zIndex: 1, width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,59,92,0.12)', border: '1.5px solid rgba(255,59,92,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: '16px solid #FF3B5C', marginLeft: 3 }} />
        </div>
        <div style={{ position: 'absolute', top: 10, left: 14, background: '#FF3B5C', color: '#fff', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4 }}>VIRAL · 94%</div>
        <div style={{ position: 'absolute', top: 32, right: 18, background: 'rgba(255,140,0,0.9)', color: '#fff', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4 }}>CLIP 02 · 87%</div>
        <div style={{ position: 'absolute', bottom: 14, left: 14, background: 'rgba(255,59,92,0.9)', color: '#fff', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4 }}>CLIP 03 · 91%</div>
      </div>
      <div style={{ padding: '12px 14px', background: '#0d0d0d' }}>
        <div style={{ height: 32, background: '#111', borderRadius: 4, position: 'relative', overflow: 'hidden', border: '1px solid #1a1a1a' }}>
          {segments.map((s, i) => (
            <div key={i} style={{ position: 'absolute', top: 8, left: s.left, width: s.width, height: 16, background: s.color, borderRadius: 3, opacity: s.opacity }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Demo({ lang }: { lang: Lang }) {
  const t = i18n[lang];

  return (
    <section id="demo" style={{ padding: '100px 80px', borderTop: '1px solid #111', position: 'relative' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 24 }}>
            {t.badge}
          </span>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {t.headline} <span className="grad-text">{t.gradPart}</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {t.steps.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, background: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 11, fontWeight: 800, color: '#FF3B5C', letterSpacing: '0.04em' }}>{s.n}</span>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 700, color: '#f2ede8', marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <a href="#waitlist" className="cta-btn">{t.cta}</a>
            </div>
          </div>
          <MiniEditor label={t.editorLabel} />
        </div>
      </div>
    </section>
  );
}
