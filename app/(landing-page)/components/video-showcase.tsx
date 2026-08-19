'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lang } from './use-lang';
import Reveal from './reveal';

const i18n = {
  es: {
    badge: '✦ Míralo de principio a fin',
    headline: 'Entra un episodio completo.',
    gradPart: 'Sale este clip.',
    sub: 'Sin timeline. Sin keyframes. Sin segunda pasada. Esto es lo que devolvió.',
    unmute: 'Activar sonido',
    mute: 'Silenciar',
  },
  en: {
    badge: '✦ See it end to end',
    headline: 'A full episode in.',
    gradPart: 'This clip out.',
    sub: 'No timeline. No keyframes. No second pass. This is what came back.',
    unmute: 'Unmute',
    mute: 'Mute',
  },
};

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      )}
    </svg>
  );
}

export default function VideoShowcase({ lang }: { lang: Lang }) {
  const t = i18n[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // Play only while on screen so the loop doesn't run (or make noise) off-view.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="video" className="section-pad" style={{ borderTop: '1px solid #111', position: 'relative' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
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
                marginBottom: 24,
              }}
            >
              {t.badge}
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-syne), sans-serif',
                fontSize: 'clamp(32px, 4vw, 52px)',
                fontWeight: 800,
                color: '#f2ede8',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              {t.headline} <span className="grad-text">{t.gradPart}</span>
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-dm-sans), sans-serif',
                fontSize: 18,
                color: '#aaa',
                maxWidth: 520,
                margin: '0 auto',
                lineHeight: 1.65,
              }}
            >
              {t.sub}
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: -40,
                background: 'radial-gradient(ellipse, rgba(255,59,92,0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid #222',
                background: '#0a0a0a',
                boxShadow: '0 0 80px rgba(255,59,92,0.12), 0 40px 100px rgba(0,0,0,0.8)',
              }}
            >
              <video
                ref={videoRef}
                src="/videos/momentreel-promo.mp4"
                poster="/videos/promo-poster.jpg"
                muted={muted}
                loop
                playsInline
                preload="metadata"
                style={{ display: 'block', width: '100%', aspectRatio: '16 / 9' }}
              />
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? t.unmute : t.mute}
                style={{
                  position: 'absolute',
                  bottom: 14,
                  right: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 18px',
                  minHeight: 44,
                  borderRadius: 100,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(10,10,10,0.7)',
                  backdropFilter: 'blur(8px)',
                  color: '#f2ede8',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                <SoundIcon muted={muted} />
                {muted ? t.unmute : t.mute}
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
