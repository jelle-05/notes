'use client'

import { X } from 'lucide-react'
import type { Label } from '@/types'
import { eventKleuren } from '@/lib/kleuren'

interface Props {
  label: Label
  onVerwijder?: () => void   // toont een ×-knop (detailweergave)
  onClick?: () => void       // maakt de pill klikbaar (filteren vanaf een kaart)
}

// Compacte label-pill met de ingestelde kleuren (of een lichte tint als fallback).
export default function LabelPill({ label, onVerwijder, onClick }: Props) {
  const { achtergrond, tekst } = eventKleuren(label)

  const klassen = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium max-w-[140px]'
  const stijl = { backgroundColor: achtergrond, color: tekst }

  // Klikbare variant: button met stopPropagation zodat de kaart niet opent.
  if (onClick) {
    return (
      <button
        onClick={e => { e.stopPropagation(); onClick() }}
        aria-label={`Filter op label ${label.naam}`}
        className={`${klassen} hover:opacity-80 transition-opacity`}
        style={stijl}
      >
        <span className="truncate">{label.naam}</span>
      </button>
    )
  }

  return (
    <span className={klassen} style={stijl}>
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
