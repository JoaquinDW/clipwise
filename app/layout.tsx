import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import { Metadata } from 'next';
import GoogleAnalyticsWrapper from '@/infra/googleAnalytics';
import GoogleTagManagerWrapper from '@/infra/googleTagManager';
import { ToastProvider } from '@/app/ui/toast';

export const metadata: Metadata = {
  title: {
    template: '%s | Clipwise',
    default: 'Clipwise - AI-Powered Video Clips',
  },
  description: 'Transform your long-form videos into viral clips with AI.',
  // metadataBase: new URL('https://mywebsite.com'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <GoogleAnalyticsWrapper />
        <GoogleTagManagerWrapper />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
