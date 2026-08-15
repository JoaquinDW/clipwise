'use client';

import Link from 'next/link';
import type { Lang } from './use-lang';
import Reveal from './reveal';
import { PLANS, TRIAL_DAYS } from '@/lib/plans';

const i18n = {
  es: {
    badge: '✦ Precios simples',
    headline: 'Elige tu',
    gradPart: 'plan',
    sub: `${TRIAL_DAYS} días de prueba gratis. Cancela cuando quieras.`,
    popularLabel: 'Más popular',
    perMonth: '/mes',
    plans: [
      {
        id: 'starter',
        desc: 'Para creadores que están empezando.',
        features: [
          `${PLANS.starter.minutesPerMonth} minutos de video al mes`,
          `Hasta ${PLANS.starter.maxClipsPerVideo} clips por video`,
          'Clips para TikTok, Reels y Shorts',
          'Subtítulos automáticos',
          'Exportación en HD',
          'Soporte por email',
        ],
        cta: 'Empezar prueba gratis',
      },
      {
        id: 'pro',
        desc: 'Para creadores en crecimiento constante.',
        features: [
          'Todo lo de Starter',
          `${PLANS.pro.minutesPerMonth} minutos de video al mes`,
          `Hasta ${PLANS.pro.maxClipsPerVideo} clips por video`,
          'Marca personalizada',
          'Plantillas avanzadas',
          'Procesamiento prioritario',
          'Soporte prioritario',
        ],
        cta: 'Empezar prueba gratis',
      },
    ],
  },
  en: {
    badge: '✦ Simple pricing',
    headline: 'Choose your',
    gradPart: 'plan',
    sub: `${TRIAL_DAYS}-day free trial. Cancel anytime.`,
    popularLabel: 'Most popular',
    perMonth: '/mo',
    plans: [
      {
        id: 'starter',
        desc: 'For creators just getting started.',
        features: [
          `${PLANS.starter.minutesPerMonth} video minutes per month`,
          `Up to ${PLANS.starter.maxClipsPerVideo} clips per video`,
          'Clips for TikTok, Reels & Shorts',
          'Auto-generated subtitles',
          'HD exports',
          'Email support',
        ],
        cta: 'Start free trial',
      },
      {
        id: 'pro',
        desc: 'For creators growing consistently.',
        features: [
          'Everything in Starter',
          `${PLANS.pro.minutesPerMonth} video minutes per month`,
          `Up to ${PLANS.pro.maxClipsPerVideo} clips per video`,
          'Custom branding',
          'Advanced templates',
          'Priority processing',
          'Priority support',
        ],
        cta: 'Start free trial',
      },
    ],
  },
};

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2.5 7L6 10.5L11.5 3.5" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Pricing({ lang }: { lang: Lang }) {
  const t = i18n[lang];

  return (
    <section id="pricing" className="section-pad" style={{ borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal style={{ textAlign: 'center', marginBottom: 72 }}>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 24 }}>
            {t.badge}
          </span>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
            {t.headline} <span className="grad-text">{t.gradPart}</span>
          </h2>
          <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 16, color: '#888' }}>{t.sub}</p>
        </Reveal>

        <div
          className="grid-2col"
          style={{ alignItems: 'start', maxWidth: 760, margin: '0 auto', gap: 20 }}
        >
          {t.plans.map(copy => {
            const plan = PLANS[copy.id as keyof typeof PLANS];
            const popular = plan.id === 'pro';

            return (
              <div
                key={plan.id}
                style={{
                  background: popular ? 'linear-gradient(180deg, rgba(255,59,92,0.06) 0%, #111 40%)' : '#111',
                  border: popular ? '1px solid rgba(255,59,92,0.3)' : '1px solid #1a1a1a',
                  borderRadius: 16,
                  padding: '32px 28px',
                  position: 'relative',
                }}
              >
                {popular && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #FF3B5C, #FF8C00)', color: '#fff', fontFamily: 'var(--font-syne), sans-serif', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                    {t.popularLabel}
                  </div>
                )}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 44, fontWeight: 800, background: 'linear-gradient(135deg,#FF3B5C,#FF8C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                      ${plan.priceMonthly}
                    </span>
                    <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#777' }}>{t.perMonth}</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#888', lineHeight: 1.5 }}>{copy.desc}</p>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {copy.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Check />
                      <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#888' }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/login?plan=${plan.id}`} className={popular ? 'cta-btn' : 'cta-ghost'} style={{ width: '100%', justifyContent: 'center', display: 'inline-flex' }}>
                  {copy.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
