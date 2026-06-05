'use client'

import { useEffect } from 'react'

export default function SwRegistratie() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.error('SW registratie mislukt:', err))
    }
  }, [])

  return null
}
