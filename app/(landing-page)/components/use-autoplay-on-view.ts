'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Plays a muted clip only while it is on screen, and only when autoplay is
 * actually welcome.
 *
 * Three things veto it: being scrolled away, `prefers-reduced-motion`, and Data
 * Saver. In every one of those cases `manual` goes true so the caller can offer
 * a play button over the poster rather than leaving a dead frame — the clip is
 * the product demo, so it must never be unreachable.
 */
export function useAutoplayOnView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData;
    if (reduced || saveData) {
      setManual(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // A rejected play() means the browser refused autoplay outright — fall
          // back to the manual control instead of leaving a dead poster.
          video.play().catch(() => setManual(true));
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const play = () => videoRef.current?.play().catch(() => {});

  return {
    videoRef,
    /** True when autoplay was vetoed and the caller should show a play button. */
    manual,
    playing,
    play,
    /** Spread onto the <video> so `playing` tracks the real element state. */
    handlers: {
      onPlay: () => setPlaying(true),
      onPause: () => setPlaying(false),
    },
  };
}
