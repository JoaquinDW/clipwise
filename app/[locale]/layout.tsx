import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Syne, DM_Sans } from 'next/font/google';
import Header from '../(landing-page)/components/header';
import Footer from '../(landing-page)/components/footer';
import type { Lang } from '../(landing-page)/components/use-lang';
import '../(landing-page)/style.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
  display: 'swap',
});

const locales = ['en', 'es'];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const messages = (await getMessages({ locale })) as any;

  return {
    title: messages.landing?.metadata?.title || 'Clipwise',
    description: messages.landing?.metadata?.description || 'Turn long videos into viral shorts',
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <div
            className={`${syne.variable} ${dmSans.variable} flex flex-col min-h-screen overflow-hidden antialiased`}
            style={{ background: '#0a0a0a', color: '#f2ede8' }}
          >
            <Header lang={locale as Lang} />
            {children}
            <Footer lang={locale as Lang} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
