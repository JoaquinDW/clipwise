import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// you must define a authorized callback in auth.config.ts
// to use this middleware
export default NextAuth(authConfig).auth;
export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  // Exclude: API routes, static files, images, test-video, AND dashboard (for testing)
  matcher: ['/((?!api|_next/static|_next/image|test-video|dashboard|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.ico$).*)'],
};