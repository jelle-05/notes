'use client'

import { useEffect } from 'react'

/** Sluit een open modal met de Escape-toets (keyboard-bediening). */
export function useEscape(open: boolean, onSluit: () => void) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onSluit() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onSluit])
}
