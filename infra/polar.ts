import { Polar } from '@polar-sh/sdk';

/**
 * Polar acts as our merchant of record: it is the legal seller, handles
 * VAT/sales tax worldwide, and pays out through Stripe Connect Express, which
 * covers countries where a direct Stripe account is not available.
 *
 * Sandbox is a fully separate instance with its own tokens, products and IDs —
 * nothing created there exists in production.
 */
const polarClientGlobal = globalThis as unknown as { polar: Polar | undefined };

export const polarServer =
  process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox';

export const polar =
  polarClientGlobal.polar ??
  new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
    server: polarServer,
  });

// Prevents a new client on every hot reload in development.
if (process.env.NODE_ENV !== 'production') polarClientGlobal.polar = polar;

export function isPolarConfigured(): boolean {
  return !!process.env.POLAR_ACCESS_TOKEN;
}
