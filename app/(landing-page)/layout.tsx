import './style.css';
import { Syne, DM_Sans } from 'next/font/google';
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
  title: 'Clipwise — Clips Virales en Minutos',
  description: 'Nuestra IA detecta los mejores momentos de tus streams y videos largos, los recorta y los optimiza para TikTok, YouTube Shorts y más — automáticamente.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className={`${syne.variable} ${dmSans.variable} flex flex-col min-h-screen overflow-hidden antialiased`} style={{ background: '#0a0a0a', color: '#f2ede8' }}>
          <Header lang="en" />
          {children}
          <Footer lang="en" />
        </div>
      </body>
    </html>
  );
}
