import { NextRequest, NextResponse } from 'next/server';
import { getLifetimeCheckoutUrl, getLifetimeOffer } from '@/lib/lifetime-sales';

// The tier is decided here, at click time, not when the page was rendered: a
// cached landing can show $30 a minute after the 20th licence sold, and the
// buyer must land on the product that is actually open.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const offer = await getLifetimeOffer();
  const url = getLifetimeCheckoutUrl(offer);
  if (!url) {
    return NextResponse.redirect(new URL('/#pricing', req.url), 303);
  }
  return NextResponse.redirect(url, 303);
}
