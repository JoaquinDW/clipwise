"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import MobileMenu from "./mobile-menu"
import Image from "next/image"
import Logo from "../../(landing-page)/public/images/logo.svg"

export default function Header() {
  const t = useTranslations("landing.header")
  const params = useParams()
  // Get locale from URL params, default to 'en' if not present
  const currentLocale = (params.locale as string) || "en"
  const [isScrolled, setIsScrolled] = useState(false)

  const showLogo = true

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const switchLocale = (newLocale: string) => {
    // Don't switch if already on that locale
    if (newLocale === currentLocale) return

    // Clear any locale-related cookies and storage
    document.cookie =
      "NEXT_LOCALE=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
    sessionStorage.removeItem("preferredLocale")
    localStorage.removeItem("preferredLocale")

    // For default locale (en), use root path
    // For other locales, use /locale path
    const path = newLocale === "en" ? "/" : `/${newLocale}`

    // Force a full page reload to ensure locale change
    window.location.href = path
  }

  return (
    <header className="fixed w-full z-30 transition-all duration-300">
      <div
        className={`mx-auto transition-all duration-300 ${
          isScrolled ? "max-w-6xl mt-4 px-4" : "max-w-7xl px-4 sm:px-6"
        }`}
      >
        <div
          className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled
              ? "h-16 bg-gray-900/60 backdrop-blur-lg shadow-2xl rounded-lg px-6 border border-white/10"
              : "h-20 bg-transparent"
          }`}
        >
          {/* Logo - Left */}
          <div className="shrink-0">
            {showLogo && (
              <Link href="/" className="block" aria-label="Clipwise">
                <Image
                  src={Logo}
                  alt="Clipwise"
                  width={200}
                  height={200}
                  className={`bg-transparent w-full transition-all duration-300 ${
                    isScrolled ? "h-7" : "h-8"
                  }`}
                />
              </Link>
            )}
          </div>

          {/* Navigation Links - Center */}
          <nav className="hidden md:flex md:grow justify-center">
            <ul className="flex items-center gap-8">
              <li>
                <Link
                  href="#features"
                  className="text-gray-300 hover:text-white transition-colors duration-150"
                >
                  {t("features")}
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-gray-300 hover:text-white transition-colors duration-150"
                >
                  {t("pricing")}
                </Link>
              </li>
              <li>
                <Link
                  href="#faq"
                  className="text-gray-300 hover:text-white transition-colors duration-150"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </nav>

          {/* Auth Buttons & Language Switcher - Right */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language switcher */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-full p-1">
              <button
                onClick={() => switchLocale("en")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  currentLocale === "en"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => switchLocale("es")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  currentLocale === "es"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                ES
              </button>
            </div>

            <Link
              href="/login"
              className="text-gray-300 hover:text-white transition-colors duration-150"
            >
              {t("signIn")}
            </Link>

            <Link
              href="/login"
              className="btn-sm text-white bg-purple-600 hover:bg-purple-700"
            >
              {t("signUp")}
            </Link>
          </div>

          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
