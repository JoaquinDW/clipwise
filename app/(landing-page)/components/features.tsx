'use client';

import type { Lang } from './use-lang';

const icons = [
  <svg key="0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4l3 3" /></svg>,
  <svg key="1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  <svg key="2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>,
  <svg key="3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  <svg key="4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  <svg key="5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
];

const i18n = {
  es: {
    badge: '✦ Todo lo que necesitas',
    headline: 'De video largo a',
    gradPart: 'clip viral',
    sub: 'Toda la cadena de producción automatizada en una sola plataforma.',
    items: [
      { title: 'Transcripción de precisión', desc: 'Tu video entra, el texto sale con marcas de tiempo palabra por palabra. 94% de precisión en más de 50 idiomas — la base que hace posible todo lo demás.' },
      { title: 'Detección de momentos IA', desc: 'La IA analiza el video completo y detecta los momentos con más potencial de retención: hooks fuertes, puntos de giro, frases que la gente repite. No los más ruidosos — los más efectivos.' },
      { title: 'Recorte 9:16 inteligente', desc: 'Sin perder la cara del speaker ni el contexto de la escena. La IA elige entre seguimiento facial, acción dinámica o letterbox desenfocado — el encuadre correcto para cada clip, automáticamente.' },
      { title: 'Captions automáticos', desc: 'El 85% de los videos se ve sin sonido. Los subtítulos se queman directamente en el clip — estilo, tamaño y posición configurables — para que funcione en cualquier feed.' },
      { title: 'Multi-plataforma', desc: 'Un video de entrada, cinco destinos de salida. Cada clip sale optimizado para TikTok, YouTube Shorts, Instagram Reels, Twitter/X y Kick — sin reexportar.' },
      { title: 'Puntuación de viralidad', desc: 'Sabés exactamente qué clips publicar primero. Cada fragmento recibe un score 0–100 basado en engagement potencial, ritmo, claridad y carga emocional.' },
    ],
  },
  en: {
    badge: '✦ Everything you need',
    headline: 'From long video to',
    gradPart: 'viral clip',
    sub: 'The entire production chain automated in a single platform.',
    items: [
      { title: 'Precision Transcription', desc: 'Your video goes in, timestamped text comes out — word by word. 94% accuracy across 50+ languages. The foundation that makes everything else possible.' },
      { title: 'AI Highlight Detection', desc: 'AI analyzes your full video and finds the moments with the highest retention potential: strong hooks, turning points, the lines people repeat. Not the loudest — the most effective.' },
      { title: 'Smart 9:16 Crop', desc: "Without losing the speaker's face or the scene's context. The AI chooses between face tracking, dynamic action, or blurred letterbox — the right framing for every clip, automatically." },
      { title: 'Auto Captions', desc: '85% of videos are watched without sound. Captions are burned directly into each clip — style, size, and position configurable — so it works in any feed.' },
      { title: 'Multi-platform', desc: 'One video in, five destinations out. Each clip exports optimized for TikTok, YouTube Shorts, Instagram Reels, Twitter/X, and Kick — no re-exporting.' },
      { title: 'Virality Score', desc: 'Know exactly which clips to post first. Each fragment gets a 0–100 score based on engagement potential, pacing, clarity, and emotional weight.' },
    ],
  },
};

export default function Features({ lang }: { lang: Lang }) {
  const t = i18n[lang];

  return (
    <section id="features" className="section-pad" style={{ position: 'relative' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 24 }}>
            {t.badge}
          </span>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
            {t.headline} <span className="grad-text">{t.gradPart}</span>
          </h2>
          <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 18, color: '#aaa', maxWidth: 480, margin: '0 auto' }}>
            {t.sub}
          </p>
        </div>
        <div className="grid-3col">
          {t.items.map((f, i) => (
            <div key={f.title} className="feature-card">
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
          ))}
        </div>
      </div>
    </section>
  );
}
