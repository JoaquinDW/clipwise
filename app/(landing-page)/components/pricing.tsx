'use client';

import Link from 'next/link';
import type { Lang } from './use-lang';

const i18n = {
  es: {
    badge: '✦ Precios simples',
    headline: 'Elige tu',
    gradPart: 'plan',
    sub: '7 días de prueba gratis. Sin tarjeta de crédito al inicio.',
    popularLabel: 'Más popular',
    plans: [
      {
        name: 'Starter',
        price: '$29',
        period: '/mes',
        desc: 'Para creadores que están empezando.',
        features: ['30 minutos de video/mes', 'Hasta 5 clips por video', 'Resolución 1080p', 'Descarga directa MP4', 'Soporte por email'],
        cta: 'Empezar gratis',
        popular: false,
      },
      {
        name: 'Pro',
        price: '$79',
        period: '/mes',
        desc: 'Para creadores en crecimiento constante.',
        features: ['120 minutos de video/mes', 'Hasta 10 clips por video', 'Resolución 4K', 'Captions personalizables', 'Soporte prioritario', 'Analytics de viralidad'],
        cta: 'Empezar con Pro',
        popular: true,
      },
      {
        name: 'Agency',
        price: '$199',
        period: '/mes',
        desc: 'Para agencias y equipos de contenido.',
        features: ['500 minutos de video/mes', 'Clips ilimitados por video', 'Resolución 4K + HDR', 'API access', 'Gestor de cuentas dedicado', 'Analytics avanzados', 'White-label disponible'],
        cta: 'Contactar ventas',
        popular: false,
      },
    ],
  },
  en: {
    badge: '✦ Simple pricing',
    headline: 'Choose your',
    gradPart: 'plan',
    sub: '7-day free trial. No credit card required to start.',
    popularLabel: 'Most popular',
    plans: [
      {
        name: 'Starter',
        price: '$29',
        period: '/mo',
        desc: 'For creators just getting started.',
        features: ['30 video minutes/month', 'Up to 5 clips per video', '1080p resolution', 'Direct MP4 download', 'Email support'],
        cta: 'Start for free',
        popular: false,
      },
      {
        name: 'Pro',
        price: '$79',
        period: '/mo',
        desc: 'For creators growing consistently.',
        features: ['120 video minutes/month', 'Up to 10 clips per video', '4K resolution', 'Customizable captions', 'Priority support', 'Virality analytics'],
        cta: 'Start with Pro',
        popular: true,
      },
      {
        name: 'Agency',
        price: '$199',
        period: '/mo',
        desc: 'For agencies and content teams.',
        features: ['500 video minutes/month', 'Unlimited clips per video', '4K + HDR resolution', 'API access', 'Dedicated account manager', 'Advanced analytics', 'White-label available'],
        cta: 'Contact sales',
        popular: false,
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
    <section id="pricing" style={{ padding: '100px 80px', borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 24 }}>
            {t.badge}
          </span>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
            {t.headline} <span className="grad-text">{t.gradPart}</span>
          </h2>
          <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 16, color: '#555' }}>{t.sub}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
          {t.plans.map(plan => (
            <div
              key={plan.name}
              style={{
                background: plan.popular ? 'linear-gradient(180deg, rgba(255,59,92,0.06) 0%, #111 40%)' : '#111',
                border: plan.popular ? '1px solid rgba(255,59,92,0.3)' : '1px solid #1a1a1a',
                borderRadius: 16,
                padding: '32px 28px',
                position: 'relative',
              }}
            >
              {plan.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #FF3B5C, #FF8C00)', color: '#fff', fontFamily: 'var(--font-syne), sans-serif', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                  {t.popularLabel}
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 14, fontWeight: 700, color: '#555', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 44, fontWeight: 800, background: 'linear-gradient(135deg,#FF3B5C,#FF8C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#444' }}>{plan.period}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#555', lineHeight: 1.5 }}>{plan.desc}</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Check />
                    <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#888' }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className={plan.popular ? 'cta-btn' : 'cta-ghost'} style={{ width: '100%', justifyContent: 'center', display: 'inline-flex' }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
