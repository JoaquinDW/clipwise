'use client';

import Link from 'next/link';
import type { Lang } from './use-lang';

const i18n = {
  es: {
    badge: '✦ Procesamiento IA en tiempo real',
    h1a: 'Tu stream.',
    h1b: 'Sus mejores',
    h1c: 'momentos.',
    sub: 'Sube cualquier video largo y recibe clips optimizados para redes sociales en minutos. Sin edición manual.',
    cta: 'Empezar gratis →',
    stats: [
      { value: '94%', label: 'Precisión IA' },
      { value: '<5min', label: 'Tiempo medio' },
      { value: '10x', label: 'Más alcance' },
      { value: '500k+', label: 'Clips creados' },
    ],
    editorLabel: '4 clips detectados',
  },
  en: {
    badge: '✦ Real-time AI processing',
    h1a: 'Your stream.',
    h1b: 'Its best',
    h1c: 'moments.',
    sub: 'Upload any long video and receive social-media-ready clips in minutes. No manual editing.',
    cta: 'Start for free →',
    stats: [
      { value: '94%', label: 'AI accuracy' },
      { value: '<5min', label: 'Avg. time' },
      { value: '10x', label: 'More reach' },
      { value: '500k+', label: 'Clips created' },
    ],
    editorLabel: '4 clips detected',
  },
};

const pills = ['TikTok', 'YouTube Shorts', 'Instagram Reels', 'Twitter/X', 'Kick'];

function OrbBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: '5%', left: '10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,59,92,0.11) 0%, transparent 68%)', filter: 'blur(32px)', animation: 'pulseOrb 9s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '0%', right: '8%', width: 550, height: 550, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,140,0,0.09) 0%, transparent 68%)', filter: 'blur(32px)', animation: 'pulseOrb 11s ease-in-out infinite 4s' }} />
    </div>
  );
}

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
        {['#ff5f57', '#ffbd2e', '#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, color: '#333', marginLeft: 8, letterSpacing: '0.04em' }}>clipwise · editor</span>
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
          {segments.map((s, i) => <div key={i} style={{ position: 'absolute', top: 8, left: s.left, width: s.width, height: 16, background: s.color, borderRadius: 3, opacity: s.opacity }} />)}
        </div>
      </div>
    </div>
  );
}

export default function Hero({ lang }: { lang: Lang }) {
  const t = i18n[lang];
  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '100px 80px', overflow: 'hidden' }}>
      <OrbBg />
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <div>
          <div className="fu d1">
            <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 28 }}>{t.badge}</span>
          </div>
          <h1 className="fu d2" style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 800, lineHeight: 1.0, color: '#f2ede8', marginBottom: 28, letterSpacing: '-0.03em', fontSize: 'clamp(44px, 5.5vw, 84px)' }}>
            {t.h1a}<br />{t.h1b}<br /><span className="grad-text">{t.h1c}</span>
          </h1>
          <p className="fu d3" style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 18, lineHeight: 1.65, color: '#666', marginBottom: 40, maxWidth: 420 }}>{t.sub}</p>
          <div className="fu d4" style={{ marginBottom: 44 }}>
            <Link href="/login" className="cta-btn">{t.cta}</Link>
          </div>
          <div className="fu d5" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pills.map(tag => <span key={tag} style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, color: '#444', border: '1px solid #1e1e1e', padding: '5px 13px', borderRadius: 100, letterSpacing: '0.02em' }}>{tag}</span>)}
          </div>
        </div>
        <div className="fu d3" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 400, background: 'radial-gradient(circle, rgba(255,59,92,0.08), transparent 70%)', pointerEvents: 'none' }} />
          <MiniEditor label={t.editorLabel} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            {t.stats.map(s => (
              <div key={s.label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg,#FF3B5C,#FF8C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#444', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
