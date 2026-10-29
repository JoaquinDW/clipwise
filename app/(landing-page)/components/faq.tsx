'use client';

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import type { Lang } from './use-lang';
import { LIFETIME_TIERS } from '@/lib/lifetime-tiers';

const [t1, t2, t3] = LIFETIME_TIERS;

// The objections to a desktop, bring-your-own-AI app are different from the
// cloud ones: what do I need, is my footage uploaded, what does "lifetime"
// really cover, and why is the price going up.
const i18n = {
  es: {
    badge: '✦ Preguntas frecuentes',
    headline: 'Las preguntas',
    gradPart: 'que de verdad nos hacen',
    items: [
      { question: '¿Qué necesito para usarlo?', answer: 'Una Mac (Apple Silicon o Intel) y un agente que hable MCP: Claude Desktop, Claude Code, Codex o Cursor. La app conecta cada uno con un clic, o con un comando en el caso de Claude Code.' },
      { question: '¿Tengo que pagar una API de OpenAI o créditos de IA?', answer: 'No. La transcripción corre en tu Mac con whisper.cpp, y la elección de momentos la hace tu agente con la suscripción que ya tienes. Nosotros no hacemos llamadas de IA por ti, por eso podemos vender una licencia de por vida.' },
      { question: '¿Mis videos se suben a algún lado?', answer: 'No. Se procesan y se guardan en tu equipo. Lo único que sale de la app es una verificación de licencia una vez al día y la búsqueda de actualizaciones. Tu agente sí ve la transcripción, que es lo que necesita para elegir.' },
      { question: '¿Funciona sin internet?', answer: 'El procesamiento de archivos locales, sí. Para importar links hace falta conexión, claro. Y la licencia aguanta hasta 14 días sin poder verificarse antes de pedirte que te conectes.' },
      { question: '¿Qué significa "lifetime"?', answer: 'Un solo pago y tienes todas las versiones que saquemos, para siempre. Sin suscripción y sin minutos: procesa todo lo que quieras.' },
      { question: '¿Por qué el precio sube?', answer: `Las primeras ${t1.seats} licencias cuestan $${t1.priceUsd}, las siguientes ${t2.seats} cuestan $${t2.priceUsd} y después el precio normal es $${t3.priceUsd}. Quien confía antes paga menos, y su precio no cambia nunca después de comprar.` },
      { question: '¿Y Windows?', answer: 'La app está construida para Mac y Windows, y Windows es lo siguiente que publicamos. La misma licencia te va a servir ahí cuando salga.' },
      { question: '¿Qué puedo importar?', answer: 'Links de YouTube, Twitch o Kick, o archivos de video como MP4 o MOV. Los links se descargan a 1440p para que el recorte vertical conserve resolución.' },
      { question: '¿Los clips llevan marca de agua?', answer: 'No. Nunca.' },
    ],
  },
  en: {
    badge: '✦ Frequently asked questions',
    headline: 'The questions',
    gradPart: 'people actually ask',
    items: [
      { question: 'What do I need to use it?', answer: 'A Mac (Apple Silicon or Intel) and an agent that speaks MCP: Claude Desktop, Claude Code, Codex or Cursor. The app connects each one in a click, or with one command for Claude Code.' },
      { question: 'Do I need an OpenAI API key or AI credits?', answer: "No. Transcription runs on your Mac with whisper.cpp, and your agent picks the moments on the subscription you already have. We make no AI calls on your behalf, which is why we can sell a lifetime licence." },
      { question: 'Are my videos uploaded anywhere?', answer: "No. They're processed and stored on your machine. The only things that leave the app are a licence check once a day and the update check. Your agent does see the transcript, since that's what it picks from." },
      { question: 'Does it work offline?', answer: 'Processing local files does. Importing links needs a connection, of course. And the licence keeps working for up to 14 days without a successful check before it asks you to go online.' },
      { question: 'What does "lifetime" mean?', answer: 'One payment and you get every version we ship, forever. No subscription and no minutes: process as much as you like.' },
      { question: 'Why does the price go up?', answer: `The first ${t1.seats} licences are $${t1.priceUsd}, the next ${t2.seats} are $${t2.priceUsd}, and after that the regular price is $${t3.priceUsd}. Early buyers pay less, and your price never changes once you buy.` },
      { question: 'What about Windows?', answer: "The app is built for both Mac and Windows, and Windows is the next thing we ship. The same licence will work there when it's out." },
      { question: 'What can I import?', answer: 'YouTube, Twitch or Kick links, or video files like MP4 and MOV. Links are pulled at 1440p so the vertical crop keeps its resolution.' },
      { question: 'Do the clips have a watermark?', answer: 'No. Never.' },
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
