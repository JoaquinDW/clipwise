'use client';

import type { Lang } from './use-lang';
import Reveal from './reveal';
import { AppleGlyph } from './hero';
import { DOWNLOADS } from '@/lib/downloads';

const i18n = {
  es: {
    headline: 'Tus próximos diez clips',
    gradPart: 'ya están grabados.',
    sub: 'Instala Momentreel, conecta tu agente y pídele el primero. Un pago, todas las versiones.',
    cta: (price: number) => `Comprar lifetime · $${price}`,
    download: 'Descargar para Mac',
    windows: 'Windows · muy pronto',
  },
  en: {
    headline: 'Your next ten clips',
    gradPart: 'are already recorded.',
    sub: 'Install Momentreel, connect your agent and ask for the first one. One payment, every version.',
    cta: (price: number) => `Get lifetime · $${price}`,
    download: 'Download for Mac',
    windows: 'Windows · coming soon',
  },
};

export default function FinalCta({ lang, priceUsd }: { lang: Lang; priceUsd: number }) {
  const t = i18n[lang];
  return (
    <section className="section-pad" style={{ borderTop: '1px solid #111', position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 500, background: 'radial-gradient(ellipse, rgba(255,59,92,0.12) 0%, rgba(255,140,0,0.05) 40%, transparent 70%)', pointerEvents: 'none' }}
      />
      <Reveal style={{ position: 'relative', textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(34px, 5vw, 64px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 20 }}>
          {t.headline} <span className="grad-text">{t.gradPart}</span>
        </h2>
        <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 18, color: '#aaa', lineHeight: 1.6, marginBottom: 36 }}>{t.sub}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          <a href="#pricing" className="cta-btn">{t.cta(priceUsd)} →</a>
          <a href={DOWNLOADS.mac.url ?? '#pricing'} className="cta-ghost">
            <AppleGlyph />
            {t.download}
          </a>
        </div>
        {DOWNLOADS.windows.available && DOWNLOADS.windows.url ? null : (
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#8a8a8a', border: '1px solid #1f1f1f', padding: '5px 14px', borderRadius: 100 }}>{t.windows}</span>
        )}
      </Reveal>
    </section>
  );
}
