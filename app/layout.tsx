import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import BotIdWrapper from './components/BotIdWrapper'
import './globals.css'

export const metadata: Metadata = {
  title: 'Patcher by DMRT',
  description: 'Patcher by DMRT',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Patcher',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Apple Touch Icon - explicit link for iOS */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* SEO and Bot Meta Tags */}
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex, noydir, noodp" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex, noydir, noodp" />
        <meta name="bingbot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="slurp" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="duckduckbot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="baiduspider" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="yandex" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="facebookexternalhit" content="noindex, nofollow" />
        <meta name="twitterbot" content="noindex, nofollow" />
        <meta name="linkedinbot" content="noindex, nofollow" />
        
        {/* Theme and App Configuration */}
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Patcher" />
      </head>
      <body className="font-sans">
        <BotIdWrapper />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
