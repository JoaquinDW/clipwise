import Hero from './hero';
import Testimonials from './testimonials';
import BeforeAfter from './before-after';
import HowItWorks from './how-it-works';
import Features from './features';
import VideoShowcase from './video-showcase';
import Pricing from './pricing';
import Faq from './faq';
import FinalCta from './final-cta';
import type { Lang } from './use-lang';
import { getLifetimeOffer } from '@/lib/lifetime-sales';

/**
 * The whole landing, shared by `/` and `/[locale]` so the two cannot drift.
 *
 * Promise → "that's me" → proof of the output → how your own agent does the
 * picking → what runs on your Mac → see it real → one price → objections → ask
 * again. Testimonials is the pain section, so it lands before any selling.
 */
export default async function Landing({ lang }: { lang: Lang }) {
  const offer = await getLifetimeOffer();
  const price = offer.open.tier.priceUsd;

  return (
    <>
      <Hero lang={lang} priceUsd={price} />
      <Testimonials lang={lang} />
      <BeforeAfter lang={lang} />
      <HowItWorks lang={lang} />
      <Features lang={lang} />
      <VideoShowcase lang={lang} />
      <Pricing lang={lang} offer={offer} />
      <Faq lang={lang} />
      <FinalCta lang={lang} priceUsd={price} />
    </>
  );
}
