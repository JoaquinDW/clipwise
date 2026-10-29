import './style.css';
import { Syne, DM_Sans } from 'next/font/google';
import { getLifetimeOffer } from '@/lib/lifetime-sales';
import Header from './components/header';
import Footer from './components/footer';

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

export const metadata = {
  // `absolute` opts out of the root layout's "%s | Momentreel" template, which
  // would otherwise render this as "Momentreel — … | Momentreel".
  title: { absolute: 'Momentreel for Mac — Short clips, picked by your own AI' },
  description: 'A Mac app that turns long videos into vertical shorts on your own computer. Your agent (Claude, Codex, Cursor) picks the moments over MCP. Nothing uploaded, no credits, one lifetime payment.',
};

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const offer = await getLifetimeOffer();

  return (
    <div className={`${syne.variable} ${dmSans.variable} flex flex-col min-h-screen overflow-hidden antialiased`} style={{ background: '#0a0a0a', color: '#f2ede8' }}>
      <Header lang="en" priceUsd={offer.open.tier.priceUsd} />
      {children}
      <Footer lang="en" />
    </div>
  );
}
