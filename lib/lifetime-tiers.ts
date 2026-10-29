/**
 * Tiered lifetime pricing: the first N licences at one price, the next M at a
 * higher one, and so on. Seller-neutral on purpose — whichever merchant of
 * record sells the licence, the website asks this which tier is open given how
 * many licences are already sold, and checks out that tier's product.
 */

export interface LifetimeTier {
  /** Licences available at this price. Null means unlimited (the last tier). */
  seats: number | null;
  priceUsd: number;
}

/** First 20 at $30, next 30 at $50, then the regular price. */
export const LIFETIME_TIERS: LifetimeTier[] = [
  { seats: 20, priceUsd: 30 },
  { seats: 30, priceUsd: 50 },
  { seats: null, priceUsd: 79 },
];

export interface OpenTier {
  index: number;
  tier: LifetimeTier;
  /** Seats left at this price, null when unlimited. */
  remaining: number | null;
  /** The tier that opens after this one sells out, for "next price" copy. */
  next: LifetimeTier | null;
}

export function currentTier(sold: number, tiers: LifetimeTier[] = LIFETIME_TIERS): OpenTier {
  if (tiers.length === 0) throw new Error('No lifetime tiers configured');
  let before = 0;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (tier.seats === null || sold < before + tier.seats) {
      return {
        index: i,
        tier,
        remaining: tier.seats === null ? null : before + tier.seats - Math.max(0, sold),
        next: tiers[i + 1] ?? null,
      };
    }
    before += tier.seats;
  }
  // Every tier is capped and all are sold out: the last price stays, with no seats left
  const last = tiers[tiers.length - 1];
  return { index: tiers.length - 1, tier: last, remaining: 0, next: null };
}
