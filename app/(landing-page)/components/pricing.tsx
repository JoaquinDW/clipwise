'use client';

import type { Lang } from './use-lang';
import Reveal from './reveal';
import WaitlistForm from './waitlist-form';
import type { LifetimeOffer } from '@/lib/lifetime-sales';

// Every bullet has to be true of the desktop app. "Windows when it ships" is a
// promise, not a feature: the build is configured (desktop/electron-builder.yml)
// and the licence API does not know about platforms, so the same key works.
const i18n = {
  es: {
    badge: '✦ Licencia de por vida',
    headline: 'Pagas una vez.',
    gradPart: 'Te quedas con todas las versiones.',
    sub: 'Sin suscripción, sin minutos, sin créditos. El precio sube por tramos a medida que se venden licencias: quien llega antes paga menos, y su precio no cambia nunca.',
    oneTime: 'pago único',
    leftAt: (n: number, price: number) => `Quedan ${n} licencias a $${price}`,
    thenPrice: (price: number) => `después $${price}`,
    soldOut: 'Todas las licencias de este tramo están vendidas.',
    ladderTitle: 'Cómo sube el precio',
    tierLabel: (seats: number | null, i: number) => (seats === null ? 'Precio normal' : i === 0 ? `Primeras ${seats}` : `Siguientes ${seats}`),
    tierSold: 'Agotado',
    tierNow: 'Ahora',
    included: 'Incluye',
    features: [
      'Todas las versiones futuras, para siempre',
      'Procesamiento ilimitado: sin minutos ni créditos',
      'Servidor MCP para Claude, Codex y Cursor',
      'Encuadre que sigue a quien habla y subtítulos automáticos',
      'Imports de YouTube, Twitch y Kick, o archivos locales',
      'Sin marca de agua',
      'Mac hoy; Windows incluido cuando salga',
    ],
    cta: (price: number) => `Comprar lifetime · $${price}`,
    secure: 'Pago seguro · recibes tu clave de licencia por email al instante',
    soonTitle: 'Las ventas abren muy pronto.',
    soonBody: (price: number) => `Deja tu email y te avisamos antes que a nadie, con el precio de $${price}.`,
    compare: 'Los clippers en la nube cobran todos los meses y te miden los minutos. Esto es un pago.',
  },
  en: {
    badge: '✦ Lifetime licence',
    headline: 'Pay once.',
    gradPart: 'Keep every version.',
    sub: 'No subscription, no minutes, no credits. The price steps up as licences sell: the earlier you are, the less you pay, and your price never changes.',
    oneTime: 'one-time payment',
    leftAt: (n: number, price: number) => `${n} licences left at $${price}`,
    thenPrice: (price: number) => `then $${price}`,
    soldOut: 'Every licence in this tier is sold.',
    ladderTitle: 'How the price steps up',
    tierLabel: (seats: number | null, i: number) => (seats === null ? 'Regular price' : i === 0 ? `First ${seats}` : `Next ${seats}`),
    tierSold: 'Sold out',
    tierNow: 'Now',
    included: "What's included",
    features: [
      'Every future version, forever',
      'Unlimited processing: no minutes, no credits',
      'MCP server for Claude, Codex and Cursor',
      'Speaker-tracking framing and automatic captions',
      'YouTube, Twitch and Kick imports, or local files',
      'No watermark',
      'Mac today; Windows included when it ships',
    ],
    cta: (price: number) => `Get lifetime · $${price}`,
    secure: 'Secure checkout · your licence key arrives by email instantly',
    soonTitle: 'Sales open very soon.',
    soonBody: (price: number) => `Leave your email and you'll hear first, at the $${price} price.`,
    compare: 'Cloud clippers bill you every month and meter your minutes. This is one payment.',
  },
};

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 3 }}>
      <path d="M2.5 7L6 10.5L11.5 3.5" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Pricing({ lang, offer }: { lang: Lang; offer: LifetimeOffer }) {
  const t = i18n[lang];
  const { open, tiers, regularPriceUsd, checkoutReady } = offer;
  const price = open.tier.priceUsd;
  const discounted = price < regularPriceUsd;
  const seats = open.tier.seats;
  const sold = seats !== null && open.remaining !== null ? seats - open.remaining : 0;
  const fill = seats ? Math.min(100, Math.max(4, (sold / seats) * 100)) : 0;

  return (
    <section id="pricing" className="section-pad" style={{ borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#FF3B5C', textTransform: 'uppercase', border: '1px solid rgba(255,59,92,0.25)', padding: '5px 16px', borderRadius: 100, display: 'inline-block', marginBottom: 24 }}>
            {t.badge}
          </span>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
            {t.headline} <span className="grad-text">{t.gradPart}</span>
          </h2>
          <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 16, lineHeight: 1.6, color: '#9a9a9a', maxWidth: 620, margin: '0 auto' }}>{t.sub}</p>
        </Reveal>

        <Reveal>
          <div
            className="pricing-card"
            style={{
              background: 'linear-gradient(180deg, rgba(255,59,92,0.07) 0%, #111 45%)',
              border: '1px solid rgba(255,59,92,0.3)',
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {/* Price, scarcity and the way in */}
            <div style={{ padding: '36px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 64, fontWeight: 800, background: 'linear-gradient(135deg,#FF3B5C,#FF8C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                  ${price}
                </span>
                {discounted && (
                  <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 26, fontWeight: 700, color: '#555', textDecoration: 'line-through' }}>${regularPriceUsd}</span>
                )}
                <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#8a8a8a' }}>{t.oneTime}</span>
              </div>

              {seats !== null && open.remaining !== null && (
                <div style={{ margin: '22px 0 28px' }}>
                  {open.remaining > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, marginBottom: 10 }}>
                      <span style={{ color: '#f2ede8', fontWeight: 500 }}>{t.leftAt(open.remaining, price)}</span>
                      {open.next && <span style={{ color: '#8a8a8a' }}>{t.thenPrice(open.next.priceUsd)}</span>}
                    </div>
                  ) : (
                    <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#f2ede8', marginBottom: 10 }}>{t.soldOut}</p>
                  )}
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={seats}
                    aria-valuenow={sold}
                    style={{ height: 8, borderRadius: 100, background: '#1d1d1d', overflow: 'hidden' }}
                  >
                    <div style={{ width: `${fill}%`, height: '100%', borderRadius: 100, background: 'linear-gradient(90deg,#FF3B5C,#FF8C00)' }} />
                  </div>
                </div>
              )}

              {checkoutReady ? (
                <>
                  <a href="/api/lifetime/checkout" className="cta-btn" style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', marginTop: seats === null ? 24 : 0 }}>
                    {t.cta(price)} →
                  </a>
                  <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#8a8a8a', textAlign: 'center', marginTop: 12 }}>{t.secure}</p>
                </>
              ) : (
                <div style={{ marginTop: seats === null ? 24 : 0 }}>
                  <p style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 17, fontWeight: 700, color: '#f2ede8', marginBottom: 6 }}>{t.soonTitle}</p>
                  <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#9a9a9a', marginBottom: 14 }}>{t.soonBody(price)}</p>
                  <WaitlistForm lang={lang} />
                </div>
              )}

              {/* The ladder, so the next price is a fact on the page and not a threat */}
              <div style={{ marginTop: 32 }}>
                <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#777', marginBottom: 12 }}>{t.ladderTitle}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tiers.map((tier, i) => {
                    const isOpen = i === open.index;
                    const isSold = i < open.index || (isOpen && open.remaining === 0);
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: isOpen ? '1px solid rgba(255,59,92,0.35)' : '1px solid #1d1d1d',
                          background: isOpen ? 'rgba(255,59,92,0.06)' : 'transparent',
                          fontFamily: 'var(--font-dm-sans), sans-serif',
                          fontSize: 14,
                          color: isSold ? '#555' : isOpen ? '#f2ede8' : '#9a9a9a',
                        }}
                      >
                        <span style={{ textDecoration: isSold ? 'line-through' : 'none' }}>{t.tierLabel(tier.seats, i)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isSold && <span style={{ fontSize: 11, color: '#666' }}>{t.tierSold}</span>}
                          {isOpen && !isSold && (
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', background: 'linear-gradient(135deg,#FF3B5C,#FF8C00)', padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase' }}>{t.tierNow}</span>
                          )}
                          <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, textDecoration: isSold ? 'line-through' : 'none' }}>${tier.priceUsd}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* What one payment buys */}
            <div className="pricing-included" style={{ padding: '36px 32px' }}>
              <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 20, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.included}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Check />
                    <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 15, color: '#c8c8c8', lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: '#8a8a8a', lineHeight: 1.6, marginTop: 28, paddingTop: 20, borderTop: '1px solid #1d1d1d' }}>{t.compare}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
