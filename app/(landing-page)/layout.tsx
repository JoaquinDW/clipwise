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
  title: 'Momentreel — Viral Clips in Minutes',
  description: 'Our AI detects the best moments from your streams and long videos, trims them, and optimizes them for TikTok, YouTube Shorts, and more — automatically.',
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
