import "@/app/ui/global.css"
import { inter } from "@/app/ui/fonts"
import { Metadata } from "next"
import GoogleAnalyticsWrapper from "@/infra/googleAnalytics"
import { Analytics } from "@vercel/analytics/next"
import GoogleTagManagerWrapper from "@/infra/googleTagManager"
import { ToastProvider } from "@/app/ui/toast"

const BASE_URL = "https://www.momentreel.app"

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: "%s | Momentreel",
    default: "Momentreel — Long videos in. Viral clips out.",
  },
  description:
    "Momentreel automatically turns your long-form videos into short viral clips for TikTok, YouTube Shorts, and Instagram Reels. Powered by AI — no editing required.",
  keywords: [
    "viral clips",
    "AI video editor",
    "short form video",
    "TikTok clips",
    "YouTube Shorts",
    "Instagram Reels",
    "video repurposing",
    "content creator tools",
    "podcast clips",
    "auto clip generator",
  ],
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Momentreel",
    title: "Momentreel — Long videos in. Viral clips out.",
    description:
      "Momentreel automatically turns your long-form videos into short viral clips for TikTok, YouTube Shorts, and Instagram Reels. Powered by AI — no editing required.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Momentreel — AI-powered viral clip generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Momentreel — Long videos in. Viral clips out.",
    description:
      "Momentreel automatically turns your long-form videos into short viral clips for TikTok, YouTube Shorts, and Instagram Reels. Powered by AI — no editing required.",
    images: ["/opengraph-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <GoogleAnalyticsWrapper />
        <GoogleTagManagerWrapper />
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
      </body>
    </html>
  )
}
