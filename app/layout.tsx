import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { CustomCursor } from "@/components/custom-cursor"
import { DataSourceNotification } from "@/components/data-source-notification"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TrendWise - AI-Powered Trending News & Insights",
  description:
    "Stay ahead with AI-curated trending news, insights, and analysis. Discover what's happening now with TrendWise.",
  keywords: "trending news, AI news, current events, technology news, business insights",
  authors: [{ name: "TrendWise AI" }],
  openGraph: {
    title: "TrendWise - AI-Powered Trending News & Insights",
    description:
      "Stay ahead with AI-curated trending news, insights, and analysis. Discover what's happening now with TrendWise.",
    type: "website",
    siteName: "TrendWise",
    images: [
      {
        url: "/placeholder.svg?height=630&width=1200",
        width: 1200,
        height: 630,
        alt: "TrendWise - AI-Powered News Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrendWise - AI-Powered Trending News & Insights",
    description: "Stay ahead with AI-curated trending news, insights, and analysis.",
    images: ["/placeholder.svg?height=630&width=1200"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CustomCursor />
          <DataSourceNotification />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
