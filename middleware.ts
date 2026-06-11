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
  // Diagnostic logging to help debug 404s on the root path
  console.log("[middleware] incoming pathname:", pathname)

  // If this is the root path, bypass intl middleware so the
  // unprefixed landing page (app/(landing-page)/page.tsx) can render.
  if (pathname === "/") {
    console.log("[middleware] root path, skipping intlMiddleware")
    return NextResponse.next()
  }

  // Only treat explicit locale-prefixed paths (/en or /es) with intl middleware
  const isLocalePath = pathname === "/es" || pathname === "/en"

  if (isLocalePath) {
    // For locale-prefixed landing pages, use intl middleware
    const response = await Promise.resolve(intlMiddleware(request))
    console.log("[middleware] using intlMiddleware for", pathname)

    // Clear any existing locale cookies to ensure fresh locale detection
    response?.cookies?.delete?.("NEXT_LOCALE")

    return response
  }

  // For all other routes, use auth middleware
  console.log("[middleware] delegating to authMiddleware for", pathname)
  return authMiddleware(request as any)
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  // Exclude: API routes, static files, images
  matcher: [
    "/((?!api|_next/static|_next/image|test-video|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.ico$|.*\\.mp4$|.*\\.webm$).*)",
  ],
}
