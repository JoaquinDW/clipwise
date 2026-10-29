import { describe, expect, it } from 'vitest';
import { currentTier } from '../lifetime-tiers';

describe('currentTier', () => {
  it('opens the first tier with every seat left', () => {
    expect(currentTier(0)).toMatchObject({ index: 0, tier: { priceUsd: 30 }, remaining: 20, next: { priceUsd: 50 } });
  });

  it('moves to the next tier exactly when one sells out', () => {
    expect(currentTier(19)).toMatchObject({ index: 0, remaining: 1 });
    expect(currentTier(20)).toMatchObject({ index: 1, tier: { priceUsd: 50 }, remaining: 30 });
    expect(currentTier(49)).toMatchObject({ index: 1, remaining: 1 });
    expect(currentTier(50)).toMatchObject({ index: 2, remaining: null, next: null });
  });

  it('reports no seats left when every tier is capped and sold', () => {
    expect(currentTier(5, [{ seats: 2, priceUsd: 10 }, { seats: 2, priceUsd: 20 }])).toMatchObject({ index: 1, remaining: 0 });
  });
});
