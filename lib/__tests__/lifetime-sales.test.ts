import { describe, expect, it } from 'vitest';
import { buildOffer, getLifetimeCheckoutUrl, parseCheckoutUrls, parseSoldCount, type LifetimeSeller } from '../lifetime-sales';

function seller(sold: number, urls: (string | null)[]): LifetimeSeller {
  return { id: 'test', soldCount: async () => sold, checkoutUrl: (i) => urls[i] ?? null };
}

describe('parseCheckoutUrls', () => {
  it('keeps tier order and drops empty or non-https entries', () => {
    expect(parseCheckoutUrls('https://a.test/1, ,http://b.test/2,https://c.test/3')).toEqual([
      'https://a.test/1',
      null,
      null,
      'https://c.test/3',
    ]);
    expect(parseCheckoutUrls(undefined)).toEqual([]);
  });
});

describe('parseSoldCount', () => {
  it('treats missing or invalid counts as zero', () => {
    expect(parseSoldCount(undefined)).toBe(0);
    expect(parseSoldCount('abc')).toBe(0);
    expect(parseSoldCount('-3')).toBe(0);
    expect(parseSoldCount('23')).toBe(23);
  });
});

describe('buildOffer', () => {
  it('checks out the open tier', async () => {
    const s = seller(22, ['https://x.test/30', 'https://x.test/50', 'https://x.test/79']);
    const offer = await buildOffer(s);
    expect(offer).toMatchObject({ sold: 22, open: { index: 1, remaining: 28 }, regularPriceUsd: 79, checkoutReady: true });
    expect(getLifetimeCheckoutUrl(offer, s)).toBe('https://x.test/50');
  });

  it('is not ready while the open tier has no link', async () => {
    const offer = await buildOffer(seller(0, []));
    expect(offer.checkoutReady).toBe(false);
  });

  it('falls back to zero sold when the seller cannot be reached', async () => {
    const s: LifetimeSeller = { id: 'down', soldCount: () => Promise.reject(new Error('down')), checkoutUrl: () => 'https://x.test' };
    expect(await buildOffer(s)).toMatchObject({ sold: 0, open: { index: 0 } });
  });
});
