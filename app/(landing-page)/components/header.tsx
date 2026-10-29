'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '../public/images/logo-horizontal.png';
import type { Lang } from './use-lang';
import { AppleGlyph } from './hero';
import { DOWNLOADS } from '@/lib/downloads';

const i18n = {
  es: {
    links: [['Características', '#features'], ['Cómo funciona', '#how-it-works'], ['Precios', '#pricing'], ['FAQ', '#faq']] as const,
    download: 'Descargar',
    cta: (price: number) => `Comprar lifetime · $${price}`,
    menu: 'Menú',
    switchLabel: 'EN',
    switchLocale: '/',
  },
  en: {
    links: [['Features', '#features'], ['How it works', '#how-it-works'], ['Pricing', '#pricing'], ['FAQ', '#faq']] as const,
    download: 'Download',
    cta: (price: number) => `Buy lifetime · $${price}`,
    menu: 'Menu',
    switchLabel: 'ES',
    switchLocale: '/es',
  },
};

export default function Header({ lang, priceUsd }: { lang: Lang; priceUsd: number }) {
  const t = i18n[lang];
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className="header-inner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,10,10,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid #1a1a1a' : 'none',
        transition: 'all 0.4s',
      }}
    >
      {/* Logo */}
      <Link href="/" aria-label="Momentreel" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <Image src={Logo} alt="Momentreel" width={1288} height={220} priority style={{ height: 30, width: 'auto' }} />
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex" style={{ gap: 34 }}>
        {t.links.map(([label, href]) => (
          <a key={label} href={href} className="nav-link" style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14 }}>
            {label}
          </a>
        ))}
      </nav>

      {/* Right side */}
      <div className="hidden md:flex" style={{ gap: 10, alignItems: 'center' }}>
        <button
          onClick={() => router.push(t.switchLocale)}
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 6, border: '1px solid #242424', background: 'transparent', color: '#444', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f2ede8'; e.currentTarget.style.borderColor = '#555'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#242424'; }}
        >
          {t.switchLabel}
        </button>
        <a href={DOWNLOADS.mac.url ?? '#pricing'} className="nav-link" style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, marginRight: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <AppleGlyph size={14} />
          {t.download}
        </a>
        <a href="#pricing" className="cta-btn" style={{ padding: '10px 22px', fontSize: 13 }}>
          {t.cta(priceUsd)}
        </a>
      </div>

      {/* Mobile menu button */}
      <button
        className="md:hidden"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f2ede8', padding: 8 }}
        aria-label={t.menu}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {menuOpen ? (
            <>
              <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: 64, left: 0, right: 0, background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #1a1a1a', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {t.links.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)} style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 16, color: '#888', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
          <a href={DOWNLOADS.mac.url ?? '#pricing'} onClick={() => setMenuOpen(false)} style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 16, color: '#888', textDecoration: 'none' }}>
            {t.download}
          </a>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="cta-btn" style={{ alignSelf: 'flex-start' }}>
              {t.cta(priceUsd)}
            </a>
            <button onClick={() => router.push(t.switchLocale)} style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 6, border: '1px solid #242424', background: 'transparent', color: '#444', cursor: 'pointer' }}>
              {t.switchLabel}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
