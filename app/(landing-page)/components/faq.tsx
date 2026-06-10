'use client';

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import type { Lang } from './use-lang';

const i18n = {
  es: {
    badge: '✦ Preguntas frecuentes',
    headline: '¿Tienes',
    gradPart: 'dudas?',
    items: [
      { question: '¿Qué formatos de video acepta Momentreel?', answer: 'Acepta archivos MP4, MOV y WebM de hasta 500 MB, o directamente URLs de YouTube. El video puede durar hasta 60 minutos.' },
      { question: '¿Cuánto tiempo tarda en procesar un video?', answer: 'La mayoría de videos de 30-60 minutos se procesan en menos de 5 minutos. La transcripción y la detección de highlights corren en paralelo para máxima velocidad.' },
      { question: '¿En qué idiomas funciona la transcripción?', answer: 'Soporta más de 50 idiomas, incluyendo español, inglés, francés, alemán, portugués, japonés y muchos más. Los captions se generan en el mismo idioma del video.' },
      { question: '¿Cómo funciona el recorte inteligente a 9:16?', answer: 'La IA analiza el contenido de la transcripción para determinar la estrategia óptima: seguimiento de cara para talking heads, seguimiento dinámico para demostraciones, letterbox desenfocado para paneles grupales o encuadre estático para pantallas y paisajes.' },
      { question: '¿Puedo personalizar los captions y el estilo?', answer: 'En los planes Pro y Agency puedes ajustar la fuente, tamaño, color y posición de los subtítulos. En el plan Starter los captions se aplican con el estilo predeterminado de Momentreel.' },
      { question: '¿Hay un período de prueba gratuito?', answer: 'Sí, todos los planes incluyen 7 días de prueba gratuita. No se requiere tarjeta de crédito para empezar. Podrás cancelar en cualquier momento desde tu panel de facturación.' },
      { question: '¿Qué pasa si supero mis minutos mensuales?', answer: 'Recibirás un aviso cuando llegues al 80% de tu cuota. Si la superas, el procesamiento se pausará hasta el siguiente ciclo o podrás comprar minutos adicionales desde tu cuenta.' },
      { question: '¿Los clips generados tienen marca de agua?', answer: 'No. Todos los clips exportados son completamente libres de marca de agua, independientemente del plan que uses.' },
    ],
  },
  en: {
    badge: '✦ Frequently asked questions',
    headline: 'Got',
    gradPart: 'questions?',
    items: [
      { question: 'What video formats does Momentreel support?', answer: 'It accepts MP4, MOV, and WebM files up to 500 MB, or directly YouTube URLs. Videos can be up to 60 minutes long.' },
      { question: 'How long does it take to process a video?', answer: 'Most 30-60 minute videos are processed in under 5 minutes. Transcription and highlight detection run in parallel for maximum speed.' },
      { question: 'What languages does transcription support?', answer: 'Momentreel supports 50+ languages including English, Spanish, French, German, Portuguese, Japanese, and many more. Captions are generated in the same language as the video.' },
      { question: 'How does the smart 9:16 crop work?', answer: 'The AI analyzes transcription content to determine the optimal strategy: face tracking for talking heads, dynamic tracking for demos, blurred letterbox for group panels, or static crop for screens and landscapes.' },
      { question: 'Can I customize captions and style?', answer: 'On Pro and Agency plans you can adjust font, size, color, and position of subtitles. On the Starter plan captions use Momentreel\'s default style.' },
      { question: 'Is there a free trial?', answer: 'Yes, all plans include a 7-day free trial. No credit card required to start. You can cancel at any time from your billing panel.' },
      { question: 'What happens if I exceed my monthly minutes?', answer: 'You\'ll receive a warning when you reach 80% of your quota. If you exceed it, processing will pause until the next cycle, or you can purchase additional minutes from your account.' },
      { question: 'Do generated clips have a watermark?', answer: 'No. All exported clips are completely watermark-free regardless of which plan you use.' },
    ],
  },
};

export default function Faq({ lang }: { lang: Lang }) {
  const t = i18n[lang];

  return (
    <section id="faq" style={{ padding: '100px 80px', borderTop: '1px solid #111' }}>
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
                    <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 700, color: open ? '#f2ede8' : '#888', transition: 'color 0.2s', lineHeight: 1.3 }}>
                      {faq.question}
                    </span>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#FF3B5C' }}>
                      <path d="M4 6.5L9 11.5L14 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </DisclosureButton>
                  <DisclosurePanel style={{ paddingBottom: 20 }}>
                    <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 15, color: '#888', lineHeight: 1.7 }}>
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
