'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Copy, X } from 'lucide-react'
import type { Notitie } from '@/types'
import { notitieAlsTekst, kopieerNaarKlembord } from '@/lib/kopieer'

interface Props {
  notitie: Notitie
}

// Kopieert de notitie als platte tekst naar het klembord, met 2s feedback.
export default function KopieerKnop({ notitie }: Props) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'fout'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  async function kopieer() {
    // Tekst synchroon binnen de klikactie opbouwen (iOS user-gesture-eis).
    const tekst = notitieAlsTekst(notitie)
    const gelukt = await kopieerNaarKlembord(tekst)
    setStatus(gelukt ? 'ok' : 'fout')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 2000)
  }

  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#34C759]">
        <Check size={16} />
        Gekopieerd
      </span>
    )
  }

  if (status === 'fout') {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-red-500">
        <X size={16} />
        Kopiëren mislukt
      </span>
    )
  }

  return (
    <button
      onClick={kopieer}
      aria-label="Kopieer als tekst"
      className="inline-flex items-center gap-1 text-[13px] font-medium text-[#007AFF] hover:text-[#0066D6] transition-colors p-1 -m-1 rounded"
    >
      <Copy size={16} />
      Kopieer
    </button>
  )
}
