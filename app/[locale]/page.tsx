import Hero from '../(landing-page)/components/hero';
import Features from '../(landing-page)/components/features';
import Demo from '../(landing-page)/components/demo';
import Waitlist from '../(landing-page)/components/waitlist';
import Faq from '../(landing-page)/components/faq';
import type { Lang } from '../(landing-page)/components/use-lang';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = (locale === 'es' ? 'es' : 'en') as Lang;

  return (
    <>
      <Hero lang={lang} />
      <Features lang={lang} />
      <Demo lang={lang} />
      <Waitlist lang={lang} />
      <Faq lang={lang} />
    </>
  );
}
