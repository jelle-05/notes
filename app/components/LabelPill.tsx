'use client'

import { X } from 'lucide-react'
import type { Label } from '@/types'
import { eventKleuren } from '@/lib/kleuren'

interface Props {
  label: Label
  onVerwijder?: () => void   // toont een ×-knop (detailweergave)
}

// Compacte label-pill met de ingestelde kleuren (of een lichte tint als fallback).
export default function LabelPill({ label, onVerwijder }: Props) {
  const { achtergrond, tekst } = eventKleuren(label)

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium max-w-[140px]"
      style={{ backgroundColor: achtergrond, color: tekst }}
    >
      <span className="truncate">{label.naam}</span>
      {onVerwijder && (
        <button
          onClick={e => { e.stopPropagation(); onVerwijder() }}
          aria-label={`Verwijder label ${label.naam}`}
          className="shrink-0 -mr-0.5 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}
