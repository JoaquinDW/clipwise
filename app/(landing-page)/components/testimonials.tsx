'use client';

import type { Lang } from './use-lang';
import Reveal from './reveal';

const i18n = {
  es: {
    badge: '✦ Beta users',
    headline: 'De 3 horas editando,',
    gradPart: 'a 5 minutos',
    items: [
      {
        quote: 'Tenía 180 episodios sin recortar acumulados. En un fin de semana procesé los últimos 20. Lo que me llevaba 3 horas por episodio ahora tarda menos de 5 minutos — y los clips se ven mejor que los que hacía yo a mano.',
        name: 'Alex M.',
        role: 'Podcast host · 78k suscriptores',
        initials: 'AM',
      },
      {
        quote: 'Hago streams de 4 horas. Antes no subía clips porque el proceso me mataba. Ahora termino el stream, proceso en Momentreel, y en 15 minutos tengo 6 clips listos para TikTok. El recorte vertical es ridículamente preciso.',
        name: 'Sarah K.',
        role: 'Twitch Partner · 19k seguidores',
        initials: 'SK',
      },
      {
        quote: 'Manejamos 11 clientes con contenido long-form. Antes necesitábamos dos editores solo para clips. Ahora uno supervisa todo el output con Momentreel y entregamos el doble de contenido por cliente.',
        name: 'Diego F.',
        role: 'Director, agencia de contenido',
        initials: 'DF',
      },
    ],
  },
  en: {
    badge: '✦ Beta users',
    headline: '3 hours of editing,',
    gradPart: 'down to 5 minutes',
    items: [
      {
        quote: "I had 180 unedited episodes sitting on my drive. Over one weekend I processed the last 20. What used to take 3 hours per episode now takes under 5 minutes — and the clips look better than what I was cutting by hand.",
        name: 'Alex M.',
        role: 'Podcast host · 78k subscribers',
        initials: 'AM',
      },
      {
        quote: "I do 4-hour streams. I wasn't clipping before because the process killed me. Now I finish the stream, run it through Momentreel, and 15 minutes later I have 6 clips ready for TikTok. The vertical crop is shockingly accurate.",
        name: 'Sarah K.',
        role: 'Twitch Partner · 19k followers',
        initials: 'SK',
      },
      {
        quote: "We manage 11 clients with long-form content. We used to need two editors just for clips. Now one editor handles all output with Momentreel and we deliver twice the content per client.",
        name: 'Diego F.',
        role: 'Director, content agency',
        initials: 'DF',
      },
    ],
  },
};

function Stars() {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 13 13" fill="#FF3B5C">
          <path d="M6.5 1l1.4 3.2L11 4.7l-2.3 2.3.5 3.2L6.5 8.8 4 10.2l.5-3.2L2 4.7l3.1-.5z" />
        </svg>
      ))}
    </div>
  );
}

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
              key={item.name}
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
              <Stars />
              <blockquote style={{
                fontFamily: 'var(--font-dm-sans), sans-serif',
                fontSize: 15,
                lineHeight: 1.7,
                color: '#aaa',
                margin: 0,
                flexGrow: 1,
              }}>
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF3B5C, #FF8C00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-syne), sans-serif',
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {item.initials}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 14, fontWeight: 700, color: '#f2ede8' }}>
                    {item.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#666', marginTop: 2 }}>
                    {item.role}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
