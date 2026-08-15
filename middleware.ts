import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import createMiddleware from "next-intl/middleware"
import { NextRequest, NextResponse } from "next/server"

const locales = ["en", "es"]
const defaultLocale = "en"

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false, // Disable automatic locale detection
})

// Create NextAuth middleware
const authMiddleware = NextAuth(authConfig).auth

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // If this is the root path, bypass intl middleware so the
  // unprefixed landing page (app/(landing-page)/page.tsx) can render.
  if (pathname === "/") {
    return NextResponse.next()
  }

  // Only treat explicit locale-prefixed paths (/en or /es) with intl middleware
  const isLocalePath = pathname === "/es" || pathname === "/en"

  if (isLocalePath) {
    // For locale-prefixed landing pages, use intl middleware
    const response = await Promise.resolve(intlMiddleware(request))

    // Clear any existing locale cookies to ensure fresh locale detection
    response?.cookies?.delete?.("NEXT_LOCALE")

    return response
  }

  // For all other routes, use auth middleware
  return authMiddleware(request as any)
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  // Exclude: API routes, static files, images
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.ico$|.*\\.mp4$|.*\\.webm$).*)",
  ],
}
