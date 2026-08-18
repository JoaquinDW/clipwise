'use client';

import type { Lang } from './use-lang';
import Reveal from './reveal';
import { PlayOverlay } from './hero';
import { useAutoplayOnView } from './use-autoplay-on-view';
import { SHOWCASE_CLIPS, SHOWCASE_STILL_SIZE, SOURCE, type ShowcaseClip } from './clip-assets';

const i18n = {
  es: {
    badge: '✦ Antes y después',
    headline: 'Una hora de grabación,',
    gradPart: 'cuatro clips listos',
    sub: 'Momentreel escucha el video entero, marca los momentos que retienen y devuelve cada uno recortado a 9:16 con los subtítulos ya quemados.',
    sourceTitle: 'Lo que subes',
    sourceMeta: 'Video largo · 16:9 · con audio',
    outputTitle: 'Lo que recibes',
    outputMeta: 'Clips 9:16 · subtítulos quemados · listos para publicar',
    clipsUnit: 'clips',
    found: 'Encontrado en',
    score: 'Viralidad',
    play: 'Reproducir el clip de ejemplo',
    stillAlt: 'Fotograma de un clip generado por Momentreel',
    clipAlt: 'Un clip real de Momentreel: recorte vertical con subtítulos automáticos',
  },
  en: {
    badge: '✦ Before and after',
    headline: 'One hour of footage,',
    gradPart: 'four clips ready to post',
    sub: 'Momentreel listens to the whole video, marks the moments that hold attention, and hands each one back cropped to 9:16 with the captions already burned in.',
    sourceTitle: 'What you upload',
    sourceMeta: 'Long video · 16:9 · with audio',
    outputTitle: 'What you get back',
    outputMeta: '9:16 clips · burned captions · ready to post',
    clipsUnit: 'clips',
    found: 'Found at',
    score: 'Virality',
    play: 'Play the sample clip',
    stillAlt: 'A frame from a clip Momentreel generated',
    clipAlt: 'A real Momentreel clip: vertical crop with auto captions',
  },
};

type Copy = (typeof i18n)['en'];

/**
 * The source, drawn as a timeline rather than mocked up as a screenshot.
 *
 * A fake player frame would be making a visual claim we can't back; a labelled
 * bar with the four detected moments in their real relative positions says the
 * same thing and is plainly a diagram.
 */
function SourceTimeline({ t }: { t: Copy }) {
  return (
    <div
      style={{
        background: '#0d0d0d',
        border: '1px solid #1a1a1a',
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-syne), sans-serif',
            fontSize: 15,
            fontWeight: 700,
            color: '#f2ede8',
          }}
        >
          {t.sourceTitle}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 13,
            color: '#9a9a9a',
          }}
        >
          {SOURCE.duration}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontSize: 13,
          color: '#9a9a9a',
          marginBottom: 28,
        }}
      >
        {t.sourceMeta}
      </div>

      {/* The bar. Each band sits at the clip's real position in the source. */}
      <div
        style={{
          position: 'relative',
          height: 72,
          borderRadius: 8,
          background: '#141414',
          border: '1px solid #1e1e1e',
          overflow: 'hidden',
        }}
      >
        {/* Inert waveform texture so the bar reads as audio, not as a progress bar. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '0 8px',
            opacity: 0.5,
          }}
        >
          {Array.from({ length: 56 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                // Deterministic pseudo-waveform: stable between renders, so it
                // never differs between the server and client markup.
                height: `${18 + ((i * 37) % 44)}%`,
                borderRadius: 1,
                background: '#2a2a2a',
              }}
            />
          ))}
        </div>
        {SHOWCASE_CLIPS.map((clip) => (
          <div
            key={clip.foundAt}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${clip.at * 100}%`,
              width: '9%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(180deg, rgba(255,59,92,0.32), rgba(255,140,0,0.22))',
              borderLeft: '1px solid rgba(255,59,92,0.7)',
              borderRight: '1px solid rgba(255,59,92,0.7)',
            }}
          />
        ))}
      </div>

      <ol
        style={{
          listStyle: 'none',
          margin: '20px 0 0',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {SHOWCASE_CLIPS.map((clip) => (
          <li
            key={clip.foundAt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 13,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: 'linear-gradient(135deg,#FF3B5C,#FF8C00)',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#9a9a9a', fontVariantNumeric: 'tabular-nums' }}>
              {clip.foundAt}
            </span>
            <span
              style={{
                color: '#cfc9c2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              &ldquo;{clip.hook}&rdquo;
            </span>
            <span
              style={{
                marginLeft: 'auto',
                color: '#FF8C00',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {clip.score}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ClipCard({ clip, t }: { clip: ShowcaseClip; t: Copy }) {
  const isVideo = Boolean(clip.video);
  const { videoRef, manual, playing, play, handlers } = useAutoplayOnView();

  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          border: isVideo ? '1.5px solid #333' : '1px solid #1e1e1e',
          background: '#0a0a0a',
          aspectRatio: '9 / 16',
          boxShadow: isVideo
            ? '0 0 50px rgba(255,59,92,0.15), 0 20px 50px rgba(0,0,0,0.7)'
            : '0 12px 32px rgba(0,0,0,0.5)',
        }}
      >
        {isVideo ? (
          /* No controls: the clip is silent (audio is stripped at encode) and a
             native control bar would break the row of otherwise identical
             cards. It plays itself, like it would in a feed. */
          <video
            ref={videoRef}
            src={clip.video}
            poster={clip.poster}
            preload="none"
            muted
            loop
            playsInline
            disablePictureInPicture
            aria-label={t.clipAlt}
            {...handlers}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <img
            src={clip.poster}
            alt={t.stillAlt}
            width={SHOWCASE_STILL_SIZE.width}
            height={SHOWCASE_STILL_SIZE.height}
            loading="lazy"
            decoding="async"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            display: 'flex',
            gap: 6,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              background: clip.score >= 90 ? '#FF3B5C' : 'rgba(255,140,0,0.9)',
              color: '#fff',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 7px',
              borderRadius: 4,
              letterSpacing: '0.06em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {clip.score}
          </span>
          <span
            style={{
              background: 'rgba(10,10,10,0.75)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f2ede8',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 7px',
              borderRadius: 4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {clip.length}
          </span>
        </div>
        {isVideo && manual && !playing && <PlayOverlay label={t.play} onClick={play} />}
      </div>
      <figcaption
        style={{
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontSize: 12,
          color: '#9a9a9a',
          marginTop: 10,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {t.found} {clip.foundAt}
      </figcaption>
    </figure>
  );
}

export default function BeforeAfter({ lang }: { lang: Lang }) {
  const t = i18n[lang];

  return (
    <section
      id="before-after"
      className="section-pad"
      style={{ borderTop: '1px solid #111', position: 'relative' }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
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
                maxWidth: 560,
                margin: '0 auto',
                lineHeight: 1.65,
              }}
            >
              {t.sub}
            </p>
          </div>
        </Reveal>

        {/* Stacked, not side by side. As two columns the source panel ran a few
            hundred pixels short of the 2x2 clip grid beside it, leaving a dead
            well on the left. Top-to-bottom also matches the direction the
            transformation actually runs: one long timeline in, four clips out. */}
        <Reveal>
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            <SourceTimeline t={t} />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            aria-hidden="true"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '28px 0 24px',
            }}
          >
            <div
              style={{
                width: 1,
                height: 28,
                background: 'linear-gradient(180deg, transparent, #FF3B5C)',
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-syne), sans-serif',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#f2ede8',
                }}
              >
                {t.outputTitle}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontSize: 13,
                  color: '#9a9a9a',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {/* Mirrors the source duration above: one number each, so the
                    two panels read as a before/after pair. */}
                {SHOWCASE_CLIPS.length} {t.clipsUnit}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-dm-sans), sans-serif',
                fontSize: 13,
                color: '#9a9a9a',
                marginBottom: 20,
              }}
            >
              {t.outputMeta}
            </div>
            <div className="clip-grid">
              {SHOWCASE_CLIPS.map((clip) => (
                <ClipCard key={clip.foundAt} clip={clip} t={t} />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
