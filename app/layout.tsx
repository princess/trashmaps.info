import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'


export const metadata: Metadata = {
  title: 'Trash Maps | Find Public Trash & Recycling Bins Near You',
  description: 'Interactive global map to locate nearby public trash cans, recycling bins, compost points, and waste disposal units. Covers 150+ countries.',
  keywords: ['trash maps', 'find recycling bins', 'public trash cans near me', 'waste disposal locations', 'recycling points map', 'compost bins near me'],
  authors: [{ name: 'Trash Maps Team' }],
  openGraph: {
    title: 'Trash Maps | Find Public Trash & Recycling Bins Near You',
    description: 'The easiest way to find public waste and recycling bins anywhere in the world.',
    url: 'https://trashmaps.info',
    siteName: 'Trash Maps',
    images: [
      {
        url: '/world-map-location-pins.png',
        width: 1200,
        height: 630,
        alt: 'Trash Maps - Interactive Bin Locator',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trash Maps | Find Public Trash & Recycling Bins Near You',
    description: 'Find nearby public trash and recycling bins in seconds.',
    images: ['/world-map-location-pins.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://trashmaps.info',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9410578522426844"
     crossOrigin="anonymous"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
