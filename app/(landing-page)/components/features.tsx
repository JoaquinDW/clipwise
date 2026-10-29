'use client';

import type { Lang } from './use-lang';
import Reveal from './reveal';

// One glyph per card, in card order: laptop (local), star (your agent picks),
// focus brackets (framing), speech bubble (captions), link (imports), infinity
// (no meter).
const icons = [
  <svg key="0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="11" rx="2" /><path d="M2 19h20" /></svg>,
  <svg key="1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  <svg key="2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M20 16v2a2 2 0 0 1-2 2h-2" /><path d="M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></svg>,
  <svg key="3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  <svg key="4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  <svg key="5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.18 8.18a5 5 0 1 1 0 7.64L12 12l-6.18 3.82a5 5 0 1 1 0-7.64L12 12z" /></svg>,
];

// Every card has to be true of the desktop app: whisper.cpp and FFmpeg run in
// the app, the agent works through the MCP tools, yt-dlp does the imports and
// there is no minute meter anywhere in desktop/.
const i18n = {
  es: {
    badge: '✦ Todo en tu equipo',
    headline: 'Un editor de clips entero.',
    gradPart: 'Sin nube de por medio.',
    sub: 'El trabajo pesado corre en tu Mac. Tu agente pone el criterio. Tú tienes la última palabra en cada clip.',
    items: [
      { title: 'Corre en tu Mac', desc: 'Transcripción con whisper.cpp y render con FFmpeg, en tu computadora. Tus videos nunca se suben a ningún servidor, y los clips quedan en una carpeta tuya.' },
      { title: 'Tu IA elige los momentos', desc: 'El agente recibe la transcripción con tiempos y una preselección de candidatos, y decide qué se sostiene solo. Le puedes pedir otro tono, otra duración u otra plataforma.' },
      { title: 'Encuadre que sigue a quien habla', desc: 'No es un recuadro fijo en el centro. El recorte vertical sigue a quien está hablando, se mantiene estable y corta en vez de barrer cuando cambia el plano.' },
      { title: 'Subtítulos listos para el feed', desc: 'Palabra por palabra, con los tiempos de Whisper y varios estilos. En el idioma en que grabaste, nunca traducido al inglés primero.' },
      { title: 'Links o archivos', desc: 'Pega un link de YouTube, Twitch o Kick, o arrastra un MP4 o MOV. Se descarga a 1440p para que el recorte vertical conserve resolución real.' },
      { title: 'Sin minutos, sin créditos', desc: 'No hay contador. Procesa episodios de tres horas o cien videos al mes: el único límite es tu disco.' },
    ],
  },
  en: {
    badge: '✦ All on your machine',
    headline: 'A whole clip editor.',
    gradPart: 'No cloud in between.',
    sub: 'The heavy lifting runs on your Mac. Your agent brings the judgement. You get the final say on every clip.',
    items: [
      { title: 'Runs on your Mac', desc: 'Transcription with whisper.cpp and rendering with FFmpeg, on your computer. Your videos are never uploaded anywhere, and the clips land in a folder you own.' },
      { title: 'Your AI picks the moments', desc: 'The agent gets the timestamped transcript plus a shortlist of candidates, and decides what stands on its own. Ask it for a different tone, length or platform.' },
      { title: 'Framing that follows the speaker', desc: 'Not a fixed box in the middle. The vertical crop tracks whoever is talking, holds steady through small movements, and cuts instead of whip-panning when the shot changes.' },
      { title: 'Captions made for the feed', desc: 'Word by word, timed from Whisper, in several styles. In the language you recorded in, never translated to English first.' },
      { title: 'Links or files', desc: 'Paste a YouTube, Twitch or Kick link, or drop in an MP4 or MOV. Links are pulled at 1440p so the vertical crop keeps real resolution.' },
      { title: 'No minutes, no credits', desc: "There's no meter. Process three-hour episodes or a hundred videos a month: the only limit is your disk." },
    ],
  },
};

export default function Features({ lang }: { lang: Lang }) {
  const t = i18n[lang];

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
