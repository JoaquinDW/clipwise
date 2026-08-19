'use client';

import type { Lang } from './use-lang';
import Reveal from './reveal';

// One glyph per card, in card order: star (picking moments), focus brackets
// (framing), speech bubble (captions), rotate-back (nothing baked in yet),
// monitor (the feed), globe (language).
const icons = [
  <svg key="0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  <svg key="1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M20 16v2a2 2 0 0 1-2 2h-2" /><path d="M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></svg>,
  <svg key="2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  <svg key="3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 5 2 11 8 11" /><path d="M4.5 15.5a9 9 0 1 0 2.1-9.4L2 11" /></svg>,
  <svg key="4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>,
  <svg key="5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
];

const i18n = {
  es: {
    badge: '✦ Automático donde es aburrido',
    headline: 'Automático donde es tedioso.',
    gradPart: 'Tuyo donde importa.',
    sub: 'Cada decisión que toma la IA es una que puedes cambiar — y nada se graba en el archivo hasta que tú lo dices.',
    items: [
      { title: 'Momentos, no solo clips', desc: 'La IA lee la transcripción completa y evalúa cada candidato por fuerza del gancho, claridad y si se entiende sin contexto. Te llegan los que vale la pena publicar — no los diez minutos más ruidosos.' },
      { title: 'Encuadre que sigue a quien habla', desc: 'No es un recuadro fijo en el centro. La cámara sigue a quien está hablando, se mantiene estable ante movimientos pequeños, y corta en vez de barrer cuando cambia el plano — como lo haría un camarógrafo.' },
      { title: 'Subtítulos que ves antes de decidir', desc: 'Cinco estilos, tres tamaños, tres posiciones. El preview no es una aproximación: es el mismo renderizador que arma el archivo, así que lo que ves es exactamente lo que descargas.' },
      { title: 'Nada se graba antes de tiempo', desc: 'Los clips quedan sin subtítulos quemados hasta que exportas. Cambias de opinión sobre el estilo o el recorte y exportas de nuevo — sin cola de renderizado, sin perder trabajo.' },
      { title: 'Hecho para aguantar el feed', desc: 'Se descarga en 1440p y se codifica una sola vez, así el recorte vertical conserva resolución real. Más una guía de zona segura de TikTok, para que tus subtítulos no terminen tapados por la interfaz.' },
      { title: 'Habla tu idioma', desc: 'Transcrito y subtitulado en el idioma en que grabaste — nunca traducido al inglés primero. Más de 50 idiomas.' },
    ],
  },
  en: {
    badge: "✦ Automatic where it's boring",
    headline: "Hands off where it's tedious.",
    gradPart: 'Yours where it matters.',
    sub: 'Every call the AI makes is one you can override — and nothing is baked into the file until you say so.',
    items: [
      { title: 'Moments, not just clips', desc: 'The AI reads the full transcript and scores every candidate on hook strength, clarity, and whether it stands alone without context. You get the ones worth posting — not the loudest ten minutes.' },
      { title: 'Framing that follows the speaker', desc: 'Not a fixed box in the middle of the frame. The camera tracks whoever is talking, holds steady through small movements, and cuts instead of whip-panning when the shot changes — the way an operator would.' },
      { title: 'Captions you see before you commit', desc: "Five styles, three sizes, three positions. The preview isn't an approximation — it's the same renderer that builds the file, so what you see is exactly what downloads." },
      { title: 'Nothing baked in too early', desc: 'Clips stay caption-free until you export. Change your mind about the style or the trim and export again — no re-render queue, no lost work.' },
      { title: 'Built to survive the feed', desc: "Pulled at 1440p and encoded once, so a vertical crop still has real resolution left. Plus a TikTok safe-area overlay, so your captions don't end up buried under the UI." },
      { title: 'It speaks your language', desc: 'Transcribed and captioned in whatever language you recorded in — never translated to English first. 50+ languages.' },
    ],
  },
};

export default function Features({ lang }: { lang: Lang }) {
  const t = i18n[lang];

  // Every other section carries this top rule; Features could skip it while it
  // sat directly under Before/After, but it now follows Demo.
  return (
    <section id="features" className="section-pad" style={{ position: 'relative', borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 24 }}>
              {t.badge}
            </span>
            <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
              {t.headline} <span className="grad-text">{t.gradPart}</span>
            </h2>
            <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 18, lineHeight: 1.6, color: '#aaa', maxWidth: 620, margin: '0 auto' }}>
              {t.sub}
            </p>
          </div>
        </Reveal>
        <div className="grid-3col">
          {t.items.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.1}>
              <div className="feature-card" style={{ height: '100%' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,59,92,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  {icons[i]}
                </div>
                <h3 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 17, fontWeight: 700, color: '#f2ede8', marginBottom: 10, letterSpacing: '-0.01em' }}>
                  {f.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#aaa', lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
