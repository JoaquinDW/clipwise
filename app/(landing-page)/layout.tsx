import './style.css';
import { Syne, DM_Sans } from 'next/font/google';
import { auth } from '@/auth';
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
  title: { absolute: 'Momentreel — Your best moments, ready to post' },
  description: 'Drop in your podcast, video, or stream. Momentreel finds the moments worth sharing, turns them into polished vertical clips, and hands you the controls before you post.',
};

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();

  return (
    <div className={`${syne.variable} ${dmSans.variable} flex flex-col min-h-screen overflow-hidden antialiased`} style={{ background: '#0a0a0a', color: '#f2ede8' }}>
      <Header lang="en" isLoggedIn={!!session?.user} />
      {children}
      <Footer lang="en" />
    </div>
  );
}
