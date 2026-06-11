'use client';

import { useState } from 'react';
import type { Lang } from './use-lang';
import Reveal from './reveal';

const i18n = {
  es: {
    badge: '✦ Acceso anticipado',
    title: 'Deja de editar. Empieza a publicar.',
    sub: 'Momentreel está casi listo. Déjanos tu email y serás el primero en entrar cuando lancemos — sin spam, solo el aviso que importa.',
    placeholder: 'tu@email.com',
    cta: 'Unirme a la lista →',
    loading: 'Guardando...',
    success: '¡Listo! Te avisamos cuando lancemos.',
    error: 'Algo salió mal. Intenta de nuevo.',
  },
  en: {
    badge: '✦ Early access',
    title: 'Stop editing. Start posting.',
    sub: "Momentreel is almost ready. Drop your email and you'll be first in line at launch — no spam, just the one email that matters.",
    placeholder: 'you@email.com',
    cta: 'Join the waitlist →',
    loading: 'Saving...',
    success: "You're in! We'll notify you when we launch.",
    error: 'Something went wrong. Please try again.',
  },
};

export default function Waitlist({ lang }: { lang: Lang }) {
  const t = i18n[lang];
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="waitlist" className="section-pad">
      <Reveal style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        {/* Badge */}
        <div style={{ marginBottom: 28 }}>
          <span
            style={{
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.16em',
              color: '#FF3B5C',
              textTransform: 'uppercase',
              border: '1px solid rgba(255,59,92,0.25)',
              padding: '5px 16px',
              borderRadius: 100,
              display: 'inline-block',
            }}
          >
            {t.badge}
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-syne), sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 56px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: '#f2ede8',
            marginBottom: 20,
          }}
        >
          {t.title}
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontSize: 18,
            lineHeight: 1.65,
            color: '#999',
            marginBottom: 40,
            maxWidth: 520,
            margin: '0 auto 40px',
          }}
        >
          {t.sub}
        </p>

        {/* Form */}
        {status === 'success' ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,59,92,0.08)',
              border: '1px solid rgba(255,59,92,0.2)',
              borderRadius: 12,
              padding: '16px 28px',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 16,
              color: '#f2ede8',
            }}
          >
            <span style={{ color: '#FF3B5C', fontSize: 18 }}>✓</span>
            {t.success}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: 20,
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t.placeholder}
              style={{
                fontFamily: 'var(--font-dm-sans), sans-serif',
                fontSize: 15,
                background: '#111',
                border: '1px solid #1e1e1e',
                borderRadius: 10,
                padding: '14px 20px',
                color: '#f2ede8',
                outline: 'none',
                width: '100%',
                maxWidth: 300,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,59,92,0.4)')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="cta-btn"
              style={{ opacity: status === 'loading' ? 0.7 : 1, cursor: status === 'loading' ? 'default' : 'pointer' }}
            >
              {status === 'loading' ? t.loading : t.cta}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#FF3B5C', marginTop: 12 }}>
            {t.error}
          </p>
        )}

      </Reveal>
    </section>
  );
}
