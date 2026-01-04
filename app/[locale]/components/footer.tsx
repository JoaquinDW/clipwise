"use client"

import React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import Image from "next/image"
import Logo from "../../(landing-page)/public/images/logo.svg"

export default function Footer() {
  const t = useTranslations("landing.footer")

  return (
    <footer>
      <div className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Top area: Blocks */}
          <div className="grid md:grid-cols-12 gap-8 lg:gap-20 mb-8 md:mb-12">
            {/* 1st block */}
            <div className="md:col-span-4 lg:col-span-5">
              <div className="mb-2">
                {/* Logo */}
                <Link href="/" className="inline-block" aria-label="Clipwise">
                  <Image
                    src={Logo}
                    alt="Clipwise"
                    width={120}
                    height={40}
                    className="h-8 bg-white rounded-full max-w-fit"
                  />
                </Link>
              </div>
              <div className="text-gray-400">{t("tagline")}</div>
            </div>

            {/* 2nd, 3rd and 4th blocks */}
            <div className="md:col-span-8 lg:col-span-7 grid sm:grid-cols-3 gap-8">
              {/* 2nd block */}
              <div className="text-sm">
                <h6 className="text-gray-200 font-medium mb-1">
                  {t("products.title")}
                </h6>
                <ul>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const linkKey = `products.links.${i}`
                    if (!t.has(`${linkKey}.label`)) return null
                    return (
                      <li key={i} className="mb-1">
                        <Link
                          href={t(`${linkKey}.href`)}
                          className="text-gray-400 hover:text-gray-100 transition duration-150 ease-in-out"
                        >
                          {t(`${linkKey}.label`)}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* 3rd block */}
              <div className="text-sm">
                <h6 className="text-gray-200 font-medium mb-1">
                  {t("company.title")}
                </h6>
                <ul>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const linkKey = `company.links.${i}`
                    if (!t.has(`${linkKey}.label`)) return null
                    return (
                      <li key={i} className="mb-1">
                        <Link
                          href={t(`${linkKey}.href`)}
                          className="text-gray-400 hover:text-gray-100 transition duration-150 ease-in-out"
                        >
                          {t(`${linkKey}.label`)}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* 4th block */}
              <div className="text-sm">
                <h6 className="text-gray-200 font-medium mb-1">
                  {t("legal.title")}
                </h6>
                <ul>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const linkKey = `legal.links.${i}`
                    if (!t.has(`${linkKey}.label`)) return null
                    return (
                      <li key={i} className="mb-1">
                        <Link
                          href={t(`${linkKey}.href`)}
                          className="text-gray-400 hover:text-gray-100 transition duration-150 ease-in-out"
                        >
                          {t(`${linkKey}.label`)}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom area */}
          <div className="md:flex md:items-center md:justify-between">
            {/* Social links */}
            <ul className="flex mb-4 md:order-1 md:ml-4 md:mb-0">
              <li>
                <Link
                  href="/"
                  className="flex justify-center items-center text-purple-600 bg-gray-800 hover:text-gray-100 hover:bg-purple-600 rounded-full transition duration-150 ease-in-out"
                  aria-label="Twitter"
                >
                  <svg
                    className="w-8 h-8 fill-current"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="m13.063 9 3.495 4.475L20.601 9h2.454l-5.359 5.931L24 23h-4.938l-3.866-4.893L10.771 23H8.316l5.735-6.342L8 9h5.063Zm-.74 1.347h-1.457l8.875 11.232h1.36l-8.778-11.232Z" />
                  </svg>
                </Link>
              </li>
              <li className="ml-4">
                <Link
                  href="/"
                  className="flex justify-center items-center text-purple-600 bg-gray-800 hover:text-gray-100 hover:bg-purple-600 rounded-full transition duration-150 ease-in-out"
                  aria-label="Instagram"
                >
                  <svg
                    className="w-8 h-8 fill-current"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="20.145" cy="11.892" r="1" />
                    <path d="M16 20c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4zm0-6c-1.103 0-2 .897-2 2s.897 2 2 2 2-.897 2-2-.897-2-2-2z" />
                    <path d="M20 24h-8c-2.056 0-4-1.944-4-4v-8c0-2.056 1.944-4 4-4h8c2.056 0 4 1.944 4 4v8c0 2.056-1.944 4-4 4zm-8-14c-.935 0-2 1.065-2 2v8c0 .953 1.047 2 2 2h8c.935 0 2-1.065 2-2v-8c0-.935-1.065-2-2-2h-8z" />
                  </svg>
                </Link>
              </li>
              <li className="ml-4">
                <Link
                  href="/"
                  className="flex justify-center items-center text-purple-600 bg-gray-800 hover:text-gray-100 hover:bg-purple-600 rounded-full transition duration-150 ease-in-out"
                  aria-label="TikTok"
                >
                  <svg
                    className="w-8 h-8 fill-current"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M16.708 8.027c.257.018.51.041.757.076.18.025.355.058.525.096 1.248.277 2.367.878 3.232 1.743.527.527.946 1.144 1.24 1.825.165.38.287.781.366 1.192.034.177.058.357.07.539.013.188.013.377.008.566a.22.22 0 0 1-.004.044v4.182c0 .045-.003.09-.01.134-.01.068-.031.132-.061.19a.426.426 0 0 1-.155.177.409.409 0 0 1-.214.061c-.045 0-.09-.004-.133-.013a.422.422 0 0 1-.185-.078 5.45 5.45 0 0 0-1.98-.867 5.387 5.387 0 0 0-2.141-.009 5.418 5.418 0 0 0-1.961.837c-.282.196-.54.423-.768.678a5.406 5.406 0 0 0-1.137 2.021 5.4 5.4 0 0 0-.223 1.584c.004.53.083 1.057.234 1.564.151.506.374.984.66 1.419.285.434.63.823 1.023 1.152a5.418 5.418 0 0 0 2.568 1.254c.532.102 1.077.14 1.62.113a5.406 5.406 0 0 0 2.517-.768 5.437 5.437 0 0 0 1.79-1.57c.236-.326.438-.676.602-1.046.164-.37.289-.756.372-1.153.042-.2.072-.403.089-.607.017-.204.021-.41.013-.615V8.696c0-.044.004-.088.013-.131a.42.42 0 0 1 .247-.313.407.407 0 0 1 .32-.007.42.42 0 0 1 .247.313c.009.043.013.087.013.131v11.767c.006.253-.005.505-.033.757a7.127 7.127 0 0 1-.178.976 7.235 7.235 0 0 1-.62 1.562 7.296 7.296 0 0 1-1.018 1.412 7.337 7.337 0 0 1-1.412 1.087 7.29 7.29 0 0 1-1.648.73 7.268 7.268 0 0 1-1.856.247c-.306.004-.611-.012-.915-.048a7.27 7.27 0 0 1-1.788-.466 7.3 7.3 0 0 1-1.597-.936 7.337 7.337 0 0 1-1.318-1.318 7.295 7.295 0 0 1-.936-1.597 7.27 7.27 0 0 1-.466-1.788 7.266 7.266 0 0 1 .178-2.772 7.305 7.305 0 0 1 1.033-2.212 7.338 7.338 0 0 1 1.763-1.763 7.294 7.294 0 0 1 2.212-1.033 7.268 7.268 0 0 1 2.535-.284c.304.025.605.068.902.13.297.061.59.139.877.234V8.027h.843z" />
                  </svg>
                </Link>
              </li>
              <li className="ml-4">
                <Link
                  href="/"
                  className="flex justify-center items-center text-purple-600 bg-gray-800 hover:text-gray-100 hover:bg-purple-600 rounded-full transition duration-150 ease-in-out"
                  aria-label="YouTube"
                >
                  <svg
                    className="w-8 h-8 fill-current"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M23.498 9.674c-.228-.23-.533-.35-.844-.355-1.22-.026-6.124-.026-6.654-.026s-5.434 0-6.654.026c-.311.005-.616.125-.844.355-.228.23-.356.537-.356.858 0 .976-.052 2.865-.052 4.468s.052 3.492.052 4.468c0 .321.128.628.356.858.228.23.533.35.844.355 1.22.026 6.124.026 6.654.026s5.434 0 6.654-.026c.311-.005.616-.125.844-.355.228-.23.356-.537.356-.858 0-.976.052-2.865.052-4.468s-.052-3.492-.052-4.468c0-.321-.128-.628-.356-.858zm-9.498 7.826v-5l5 2.5-5 2.5z" />
                  </svg>
                </Link>
              </li>
            </ul>

            {/* Copyrights note */}
            <div className="text-gray-400 text-sm mr-4">
              &copy; Clipwise {new Date().getFullYear()}. {t("copyright")}
              <div className="text-xs mt-1 text-gray-500">{t("credits")}</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
