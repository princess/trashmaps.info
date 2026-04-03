import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://trashmaps.info'),
  title: 'Trash Maps | Find Public Trash & Recycling Bins Near You',
  description: 'Interactive global map to locate nearby public trash cans, recycling bins, compost points, and waste disposal units. Covers 150+ countries.',
  keywords: [
    'trash maps', 'find recycling bins', 'public trash cans near me', 
    'waste disposal locations', 'recycling points map', 'compost bins near me',
    'street bins', 'public garbage cans', 'nearby recycling center', 
    'waste management map', 'eco-friendly waste disposal', 'find trash bins'
  ],
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
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://trashmaps.info',
    languages: {
      'en-US': 'https://trashmaps.info',
      'x-default': 'https://trashmaps.info',
    },
  },
  appleWebApp: {
    title: 'Trash Maps',
    statusBarStyle: 'default',
    capable: true,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
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
        <link rel="preconnect" href="https://basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://overpass-api.de" />
        <link rel="dns-prefetch" href="https://overpass-api.de" />
        <link rel="preconnect" href="https://nominatim.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />
        <link rel="preconnect" href="https://photon.komoot.io" />
        <link rel="dns-prefetch" href="https://photon.komoot.io" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        <link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="Trash Maps" />
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
