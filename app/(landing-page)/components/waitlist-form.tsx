'use client';

import { useState } from 'react';
import type { Lang } from './use-lang';

// Posts to the existing /api/waitlist (WaitlistEntry, exported with
// `pnpm run waitlist:export`). Shown in place of the buy button until the open
// tier has a checkout link.
const i18n = {
  es: { placeholder: 'tu@email.com', submit: 'Avisarme', sending: 'Enviando…', done: '¡Listo! Te escribimos cuando abran las ventas.', error: 'No pudimos guardarlo. Prueba de nuevo.' },
  en: { placeholder: 'you@email.com', submit: 'Notify me', sending: 'Sending…', done: "You're in. We'll email you when sales open.", error: "Couldn't save that. Try again." },
};

export default function WaitlistForm({ lang }: { lang: Lang }) {
  const t = i18n[lang];
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  if (state === 'done') {
    return <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#28c840' }}>{t.done}</p>;
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setState('sending');
        const res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }).catch(() => null);
        setState(res?.ok ? 'done' : 'error');
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          style={{ flex: '1 1 200px', minWidth: 0, background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '13px 14px', color: '#f2ede8', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 15 }}
        />
        <button type="submit" className="cta-btn" disabled={state === 'sending'} style={{ flex: '0 0 auto', justifyContent: 'center' }}>
          {state === 'sending' ? t.sending : t.submit}
        </button>
      </div>
      {state === 'error' && <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: '#FF3B5C' }}>{t.error}</p>}
    </form>
  );
}
