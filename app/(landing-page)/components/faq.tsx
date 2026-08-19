'use client';

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import type { Lang } from './use-lang';

// Answers 3 and 4 replaced a question about how the crop works internally. The
// two real objections to this category are "will the output be postable?" and
// "can I fix it if it isn't?", and those are what the product answers.
const i18n = {
  es: {
    badge: '✦ Preguntas frecuentes',
    headline: 'Las preguntas',
    gradPart: 'que de verdad nos hacen',
    items: [
      { question: '¿Qué puedo subir?', answer: 'MP4, MOV o WebM de hasta 500 MB, o un link de YouTube, Twitch o Kick. Los videos pueden durar hasta 60 minutos en cualquiera de los dos planes.' },
      { question: '¿Cuánto tarda?', answer: 'Un video de una hora suele estar listo en bastante menos de diez minutos. No tienes que esperar mirando — el panel te muestra en qué etapa va todo el tiempo.' },
      { question: '¿Los clips van a ser lo bastante buenos para publicar?', answer: 'Esa es la apuesta entera. Cada momento se evalúa por fuerza del gancho, claridad y si se entiende sin el resto del video — y ves esa puntuación antes de publicar nada. Si un clip está cerca pero no del todo, lo ajustas en el editor en vez de empezar de nuevo.' },
      { question: '¿Puedo cambiar lo que decidió la IA?', answer: 'En todos los clips. Mueves el inicio y el final hasta 15 segundos, cambias el estilo, tamaño y posición de los subtítulos, y lo revisas contra la zona segura de TikTok antes de exportar.' },
      { question: '¿Funciona en otros idiomas además del inglés?', answer: 'Sí, más de 50. Los clips se transcriben y subtitulan en el idioma en que grabaste. Nunca traducimos al inglés primero.' },
      { question: '¿Hay prueba gratis?', answer: 'Siete días o 30 minutos procesados, lo que ocurra primero. Pedimos tarjeta por adelantado pero no cobramos nada hasta que termine la prueba. Cancelas desde tu panel de facturación y no se te cobra.' },
      { question: '¿Qué pasa si supero mis minutos del mes?', answer: 'Te avisamos al 80% de tu cuota. Si la superas, el procesamiento se pausa hasta el siguiente ciclo — o puedes cambiar de plan cuando quieras desde tu panel de facturación.' },
      { question: '¿Los clips llevan marca de agua?', answer: 'No. Sin marca de agua en ningún plan, tampoco durante la prueba.' },
    ],
  },
  en: {
    badge: '✦ Frequently asked questions',
    headline: 'The questions',
    gradPart: 'people actually ask',
    items: [
      { question: 'What can I put in?', answer: 'MP4, MOV, or WebM up to 500 MB, or a link from YouTube, Twitch, or Kick. Videos can be up to 60 minutes long on either plan.' },
      { question: 'How long does it take?', answer: "An hour-long video is usually done in well under ten minutes. You don't have to sit there — the dashboard shows you exactly what stage it's on the whole way through." },
      { question: 'Will the clips actually be good enough to post?', answer: "That's the whole bet. Every moment gets scored on hook strength, clarity, and whether it makes sense without the rest of the video — and you see that score before you post anything. If a clip is close but not right, adjust it in the editor instead of starting over." },
      { question: 'Can I change what the AI decided?', answer: "On every clip. Move the start and end by up to 15 seconds, switch the caption style, size, and position, and preview it against TikTok's safe area before you export." },
      { question: 'Does it work in languages other than English?', answer: 'Yes — 50+ of them. Clips are transcribed and captioned in the language you recorded in. We never translate to English first.' },
      { question: 'Is there a free trial?', answer: "Seven days or 30 processed minutes, whichever comes first. We ask for a card up front but charge nothing until the trial ends. Cancel from your billing page and you won't be charged." },
      { question: 'What if I go over my monthly minutes?', answer: "You'll get a warning at 80% of your quota. Past it, processing pauses until your next cycle — or you can move up a plan any time from your billing page." },
      { question: 'Do the clips have a watermark?', answer: 'No. No watermark on any plan, including during the trial.' },
    ],
  },
};

export default function Faq({ lang }: { lang: Lang }) {
  const t = i18n[lang];

  return (
    <section id="faq" className="section-pad" style={{ borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 24 }}>
            {t.badge}
          </span>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {t.headline} <span className="grad-text">{t.gradPart}</span>
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {t.items.map((faq, index) => (
            <Disclosure key={index}>
              {({ open }) => (
                <div style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <DisclosureButton style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}>
                    <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 700, color: open ? '#f2ede8' : '#bbb', transition: 'color 0.2s', lineHeight: 1.3 }}>
                      {faq.question}
                    </span>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#FF3B5C' }}>
                      <path d="M4 6.5L9 11.5L14 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </DisclosureButton>
                  <DisclosurePanel style={{ paddingBottom: 20 }}>
                    <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 15, color: '#aaa', lineHeight: 1.7 }}>
                      {faq.answer}
                    </p>
                  </DisclosurePanel>
                </div>
              )}
            </Disclosure>
          ))}
        </div>
      </div>
    </section>
  );
}
