import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import SwRegistratie from '@/components/SwRegistratie'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Notities',
  description: 'Persoonlijke notities en lijstjes',
  // Zelfde logo overal: browser-tab (SVG + PNG-fallback), iOS-beginscherm
  // (apple-touch) en de PWA-manifest-icons komen allemaal uit public/icon.svg
  // (PNG's gegenereerd via scripts/generate-icons.mjs).
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Notities',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${geist.variable} h-full`} style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}>
      <body className="h-full overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
        <SwRegistratie />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  )
}
