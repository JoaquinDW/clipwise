import Hero from '../(landing-page)/components/hero';
import BeforeAfter from '../(landing-page)/components/before-after';
import VideoShowcase from '../(landing-page)/components/video-showcase';
import Features from '../(landing-page)/components/features';
import Demo from '../(landing-page)/components/demo';
import Testimonials from '../(landing-page)/components/testimonials';
import Pricing from '../(landing-page)/components/pricing';
import Faq from '../(landing-page)/components/faq';
import type { Lang } from '../(landing-page)/components/use-lang';

// Keep this section order in sync with app/(landing-page)/page.tsx — the two
// render the same components and silently drift otherwise.
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = (locale === 'es' ? 'es' : 'en') as Lang;

  return (
    <>
      <Hero lang={lang} />
      <BeforeAfter lang={lang} />
      <Features lang={lang} />
      <Demo lang={lang} />
      <VideoShowcase lang={lang} />
      <Testimonials lang={lang} />
      <Pricing lang={lang} />
      <Faq lang={lang} />
    </>
  );
}
