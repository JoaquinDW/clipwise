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
    badge: '✦ Para quién es',
    headline: 'No te falta contenido.',
    gradPart: 'Te falta tiempo para clippearlo.',
    items: [
      {
        quote: 'Grabaste 3 horas de oro. Ahora está en tu disco porque recortar clips tarda más que grabar el episodio.',
        role: 'Podcasters y YouTubers',
      },
      {
        quote: 'Tus mejores momentos pasan en vivo. Para cuando recortaste a 9:16 y quemaste los subtítulos, la ventana del algoritmo ya cerró.',
        role: 'Streamers y creadores en vivo',
      },
      {
        quote: 'Tus clientes quieren 6 clips por video. Tú entregas 2 porque la math no cierra editando a mano. Momentreel cambia el denominador.',
        role: 'Agencias y editores de video',
      },
    ],
  },
  en: {
    badge: "✦ Who it's for",
    headline: "You're not short on content.",
    gradPart: "You're short on time to clip it.",
    items: [
      {
        quote: "You recorded 3 hours of gold. Now it's sitting on your drive because cutting clips takes longer than recording the episode itself.",
        role: 'Podcasters & YouTubers',
      },
      {
        quote: "Your best moments happen live. By the time you've clipped, cropped to 9:16, and burned captions — the algorithm window has already closed.",
        role: 'Streamers & live creators',
      },
      {
        quote: "Your clients want 6 clips per video. You're quoting 2 because the math doesn't work with manual editing. Momentreel changes the denominator.",
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
