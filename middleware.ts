import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'es'];
const defaultLocale = 'en';

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false, // Disable automatic locale detection
});

// Create NextAuth middleware
const authMiddleware = NextAuth(authConfig).auth;

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a locale-prefixed path or root
  const isLocalePath = pathname === '/' || pathname === '/es' || pathname === '/en';

  if (isLocalePath) {
    // For landing page, use intl middleware
    const response = intlMiddleware(request);

    // Clear any existing locale cookies to ensure fresh locale detection
    if (pathname === '/' || pathname === '/es' || pathname === '/en') {
      response.cookies.delete('NEXT_LOCALE');
    }

    return response;
  }

  // For all other routes, use auth middleware
  return authMiddleware(request as any);
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  // Exclude: API routes, static files, images
  matcher: ['/((?!api|_next/static|_next/image|test-video|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.ico$).*)'],
};