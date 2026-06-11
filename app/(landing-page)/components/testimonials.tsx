'use client';

import type { Lang } from './use-lang';
import Reveal from './reveal';

const i18n = {
  es: {
    badge: '✦ Hecho para creadores como tú',
    headline: 'No te falta contenido.',
    gradPart: 'Te falta tiempo para clippearlo.',
    items: [
      {
        quote: 'Grabaste 3 horas de oro. Ahora está en tu disco porque recortar clips tarda más que grabar el episodio.',
        role: 'Podcasters y YouTubers',
        icon: '🎙️',
      },
      {
        quote: 'Tus mejores momentos pasan en vivo. Para cuando recortaste a 9:16 y quemaste los subtítulos, la ventana del algoritmo ya cerró.',
        role: 'Streamers y creadores en vivo',
        icon: '🎮',
      },
      {
        quote: 'Tus clientes quieren 6 clips por video. Tú entregas 2 porque la math no cierra editando a mano. Momentreel cambia el denominador.',
        role: 'Agencias y editores de video',
        icon: '🏢',
      },
    ],
  },
  en: {
    badge: '✦ Built for creators like you',
    headline: "You're not short on content.",
    gradPart: "You're short on time to clip it.",
    items: [
      {
        quote: "You recorded 3 hours of gold. Now it's sitting on your drive because cutting clips takes longer than recording the episode itself.",
        role: 'Podcasters & YouTubers',
        icon: '🎙️',
      },
      {
        quote: "Your best moments happen live. By the time you've clipped, cropped to 9:16, and burned captions — the algorithm window has already closed.",
        role: 'Streamers & live creators',
        icon: '🎮',
      },
      {
        quote: "Your clients want 6 clips per video. You're quoting 2 because the math doesn't work with manual editing. Momentreel changes the denominator.",
        role: 'Agencies & video editors',
        icon: '🏢',
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
              <div style={{ fontSize: 28 }}>{item.icon}</div>
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
                color: '#555',
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
