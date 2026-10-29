/**
 * Where the website learns how many lifetime licences are sold and where to
 * send a buyer, without knowing who the seller is.
 *
 * The merchant of record is still undecided (Polar, Lemon Squeezy, …). Both sell
 * a product through a hosted checkout link, so each tier in lib/lifetime-tiers.ts
 * maps to one product and one link. Picking a seller means writing one
 * `LifetimeSeller` that counts sales from its API (or from our licence table);
 * the landing and the checkout route only ever call `getLifetimeOffer()`.
 */
import { cache } from 'react';
import { currentTier, LIFETIME_TIERS, type LifetimeTier, type OpenTier } from './lifetime-tiers';

export interface LifetimeSeller {
  readonly id: string;
  /** Licences sold so far, refunds excluded. */
  soldCount(): Promise<number>;
  /** Hosted checkout for a tier's product, or null when it is not set up yet. */
  checkoutUrl(tierIndex: number): string | null;
}

/** Comma-separated list in tier order; an empty entry leaves that tier without checkout. */
export function parseCheckoutUrls(raw: string | undefined): (string | null)[] {
  if (!raw) return [];
  return raw.split(',').map((url) => {
    const trimmed = url.trim();
    return /^https:\/\//.test(trimmed) ? trimmed : null;
  });
}

export function parseSoldCount(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Until a seller is chosen: the count and the links come from the environment,
 * so sales can open with plain checkout links and a hand-updated count.
 */
export const envSeller: LifetimeSeller = {
  id: 'env',
  soldCount: async () => parseSoldCount(process.env.LIFETIME_SOLD_COUNT),
  checkoutUrl: (tierIndex) => parseCheckoutUrls(process.env.LIFETIME_CHECKOUT_URLS)[tierIndex] ?? null,
};

export interface LifetimeOffer {
  sold: number;
  open: OpenTier;
  tiers: LifetimeTier[];
  /** Price buyers pay once the discounted tiers are gone, for the strikethrough. */
  regularPriceUsd: number;
  /** False until the open tier has a checkout link: the landing shows the waitlist instead. */
  checkoutReady: boolean;
}

export async function buildOffer(seller: LifetimeSeller, tiers: LifetimeTier[] = LIFETIME_TIERS): Promise<LifetimeOffer> {
  const sold = await seller.soldCount().catch(() => 0);
  const open = currentTier(sold, tiers);
  const soldOut = open.remaining === 0;
  return {
    sold,
    open,
    tiers,
    regularPriceUsd: tiers[tiers.length - 1].priceUsd,
    checkoutReady: !soldOut && seller.checkoutUrl(open.index) !== null,
  };
}

/** Deduplicated per request: the header, hero and pricing all ask for it. */
export const getLifetimeOffer = cache(() => buildOffer(envSeller));

export function getLifetimeCheckoutUrl(offer: LifetimeOffer, seller: LifetimeSeller = envSeller): string | null {
  return offer.checkoutReady ? seller.checkoutUrl(offer.open.index) : null;
}
