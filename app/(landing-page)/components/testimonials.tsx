'use client';

import type { Lang } from './use-lang';
import Reveal from './reveal';

// Same visual language as features.tsx: 24px, stroke 1.5, brand red. Emoji were
// used here before — they're font-dependent, render differently on every OS, and
// can't be themed, so they have no business as structural icons.
const icons = [
  <svg key="0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" /></svg>,
  <svg key="1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" /><rect x="2" y="6" width="20" height="12" rx="6" /></svg>,
  <svg key="2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M15 21V11h4a2 2 0 0 1 2 2v8" /><line x1="9" y1="7" x2="11" y2="7" /><line x1="9" y1="11" x2="11" y2="11" /><line x1="9" y1="15" x2="11" y2="15" /></svg>,
];

const i18n = {
  es: {
    badge: '✦ Por qué sigue ahí sin publicar',
    headline: 'Sabes que ahí adentro hay diez momentos buenos.',
    gradPart: 'Lo que no quieres es volver a verlo entero.',
    sub: 'El problema no es que clipear sea difícil. Es que hacerlo bien significa una segunda pasada por material que ya viviste una vez.',
    items: [
      {
        quote: 'Tres horas grabadas, nada publicado. No por falta de ganas — sino porque encontrar los cuatro momentos que funcionan significa recorrer el episodio otra vez.',
        role: 'Podcasters y YouTubers',
      },
      {
        quote: 'El mejor momento pasó en la hora cuatro. Para cuando lo encontraste, lo recortaste y arreglaste los subtítulos, el momento ya se enfrió. El algoritmo también.',
        role: 'Streamers y creadores en vivo',
      },
      {
        quote: 'Ya probaste los clippers automáticos. Te devolvieron quince clips y publicaste dos. Los otros trece te costaron el tiempo que querías ahorrar.',
        role: 'Agencias y editores de video',
      },
    ],
  },
  en: {
    badge: "✦ Why it's still sitting there",
    headline: 'You know there are ten good moments in there.',
    gradPart: "You just don't want to watch it again.",
    sub: "It's not that clipping is hard. It's that doing it well means a second pass through footage you already lived through once.",
    items: [
      {
        quote: "Three hours recorded, nothing posted. Not because you're lazy — because finding the four moments that actually land means scrubbing the whole episode again.",
        role: 'Podcasters & YouTubers',
      },
      {
        quote: "The best moment happened at hour four. By the time you've found it, cropped it, and fixed the captions, the moment is cold and so is the algorithm.",
        role: 'Streamers & live creators',
      },
      {
        quote: "You've tried the auto-clippers. They handed you fifteen clips and you posted two. The other thirteen cost you the time you were trying to save.",
        role: 'Agencies & video editors',
      },
    ],
  },
};

export default function Testimonials({ lang }: { lang: Lang }) {
  const t = i18n[lang];

  return (
    <section className="section-pad" style={{ borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 24 }}>
              {t.badge}
            </span>
            <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {t.headline} <span className="grad-text">{t.gradPart}</span>
            </h2>
            <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 17, lineHeight: 1.65, color: '#aaa', maxWidth: 620, margin: '20px auto 0' }}>
              {t.sub}
            </p>
          </div>
        </Reveal>
        <div className="grid-3col">
          {t.items.map((item, i) => (
            <Reveal
              key={item.role}
              delay={i * 0.1}
              style={{
                background: '#111',
                border: '1px solid #1a1a1a',
                borderRadius: 16,
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,59,92,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icons[i]}
              </div>
              <p style={{
                fontFamily: 'var(--font-dm-sans), sans-serif',
                fontSize: 15,
                lineHeight: 1.7,
                color: '#aaa',
                margin: 0,
                flexGrow: 1,
              }}>
                {item.quote}
              </p>
              <div style={{
                fontFamily: 'var(--font-syne), sans-serif',
                fontSize: 13,
                fontWeight: 700,
                // #555 on #111 is ~2.7:1 — well under AA.
                color: '#9a9a9a',
                borderTop: '1px solid #1a1a1a',
                paddingTop: 16,
              }}>
                {item.role}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
