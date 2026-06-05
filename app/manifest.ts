import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Notities',
    short_name: 'Notities',
    description: 'Persoonlijke notities en lijstjes',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icon.svg',          sizes: 'any',     type: 'image/svg+xml' },
      { src: '/icon-192.png',      sizes: '192x192', type: 'image/png'     },
      { src: '/icon-512.png',      sizes: '512x512', type: 'image/png'     },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
