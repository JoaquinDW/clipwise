import Landing from '../(landing-page)/components/landing';
import type { Lang } from '../(landing-page)/components/use-lang';

export const revalidate = 300;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = (locale === 'es' ? 'es' : 'en') as Lang;
  return <Landing lang={lang} />;
}
