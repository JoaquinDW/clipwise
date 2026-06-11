"use client"

import Link from "next/link"
import type { Lang } from "./use-lang"

const i18n = {
  es: {
    tagline:
      "Convierte tus streams y videos largos en clips virales optimizados para redes sociales — automáticamente.",
    product: "Producto",
    productLinks: [
      ["Características", "#features"],
      ["Cómo funciona", "#demo"],
      ["Lista de espera", "#waitlist"],
      ["FAQ", "#faq"],
    ] as const,
    account: "Cuenta",
    accountLinks: [
      ["Unirme a la lista", "#waitlist"],
      ["Dashboard", "/dashboard"],
    ] as const,
    copyright: "© 2026 Momentreel. Todos los derechos reservados.",
  },
  en: {
    tagline:
      "Turn your streams and long videos into viral clips optimized for social media — automatically.",
    product: "Product",
    productLinks: [
      ["Features", "#features"],
      ["How it works", "#demo"],
      ["Waitlist", "#waitlist"],
      ["FAQ", "#faq"],
    ] as const,
    account: "Account",
    accountLinks: [
      ["Join the waitlist", "#waitlist"],
      ["Dashboard", "/dashboard"],
    ] as const,
    copyright: "© 2026 Momentreel. All rights reserved.",
  },
}

export default function Footer({ lang }: { lang: Lang }) {
  const t = i18n[lang]

  return (
    <footer
      className="section-pad-footer"
      style={{ borderTop: "1px solid #111" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div className="footer-grid" style={{ marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div
              className="grad-text"
              style={{
                fontFamily: "var(--font-syne), sans-serif",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                marginBottom: 12,
              }}
            >
              Momentreel
            </div>
            <p
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 14,
                color: "#777",
                lineHeight: 1.65,
                maxWidth: 260,
              }}
            >
              {t.tagline}
            </p>
          </div>

          {/* Product */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-syne), sans-serif",
                fontSize: 12,
                fontWeight: 700,
                color: "#777",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              {t.product}
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {t.productLinks.map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    className="footer-link"
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 14,
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-syne), sans-serif",
                fontSize: 12,
                fontWeight: 700,
                color: "#777",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              {t.account}
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {t.accountLinks.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="footer-link"
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 14,
                    }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            borderTop: "1px solid #111",
            paddingTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 13,
              color: "#777",
            }}
          >
            {t.copyright}
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            <a
              href="https://x.com/baltha05"
              className="social-link"
              aria-label="Twitter/X"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="m13.063 9 3.495 4.475L20.601 9h2.454l-5.359 5.931L24 23h-4.938l-3.866-4.893L10.771 23H8.316l5.735-6.342L8 9h5.063Zm-.74 1.347h-1.457l8.875 11.232h1.36l-8.778-11.232Z" />
              </svg>
            </a>
            {/* <a href="#" className="social-link" aria-label="Instagram">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a> */}
          </div>
        </div>
      </div>
    </footer>
  )
}
