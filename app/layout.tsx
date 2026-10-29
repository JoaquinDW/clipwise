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
    default: "Momentreel for Mac — Short clips, picked by your own AI",
  },
  description:
    "A Mac app that turns long videos into vertical shorts on your own computer. Your agent (Claude, Codex, Cursor) picks the moments over MCP. Nothing uploaded, no credits, one lifetime payment.",
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
    "Mac app",
    "MCP",
    "lifetime licence",
  ],
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Momentreel",
    title: "Momentreel — Your best moments, ready to post",
    description:
      "Drop in your podcast, video, or stream. Momentreel finds the moments worth sharing, turns them into polished vertical clips, and hands you the controls before you post.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Momentreel — your best moments, ready to post",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Momentreel — Your best moments, ready to post",
    description:
      "Drop in your podcast, video, or stream. Momentreel finds the moments worth sharing, turns them into polished vertical clips, and hands you the controls before you post.",
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
