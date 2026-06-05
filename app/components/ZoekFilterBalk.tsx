'use client'

import { Check, Search, X } from 'lucide-react'
import type { Label } from '@/types'
import { eventKleuren } from '@/lib/kleuren'

interface Props {
  zoekterm: string
  onZoek: (term: string) => void
  labels: Label[]
  actieveLabelIds: string[]
  onToggleLabel: (id: string) => void
  onWisFilters: () => void
}

// Zoekveld + label-filterpills boven het notitie-grid. Filteren is volledig
// client-side (afgeleide state in NotesApp); meerdere actieve labels = OR-logica.
export default function ZoekFilterBalk({ zoekterm, onZoek, labels, actieveLabelIds, onToggleLabel, onWisFilters }: Props) {
  const heeftFilters = zoekterm.trim() !== '' || actieveLabelIds.length > 0

  return (
    <div className="px-3 sm:px-4 pt-3 space-y-2">
      {/* Zoekveld */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={zoekterm}
          onChange={e => onZoek(e.target.value)}
          placeholder="Zoek notities…"
          className="flex-1 min-w-0 text-[15px] py-2.5 outline-none bg-transparent placeholder:text-gray-300"
        />
        {zoekterm !== '' && (
          <button
            onClick={() => onZoek('')}
            aria-label="Wis zoekterm"
            className="shrink-0 p-1.5 -m-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Label-filterpills (horizontaal scrollbaar bij veel labels) */}
      {labels.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 [-webkit-overflow-scrolling:touch]">
          {labels.map(label => {
            const actief = actieveLabelIds.includes(label.id)
            const kleuren = eventKleuren(label)
            return (
              <button
                key={label.id}
                onClick={() => onToggleLabel(label.id)}
                aria-pressed={actief}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium shrink-0 transition',
                  actief
                    ? 'ring-2 ring-[#007AFF]/40'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300',
                ].join(' ')}
                style={actief ? { backgroundColor: kleuren.achtergrond, color: kleuren.tekst } : undefined}
              >
                {actief
                  ? <Check size={13} className="shrink-0" />
                  : <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: label.kleur }} />}
                <span className="truncate max-w-[140px]">{label.naam}</span>
              </button>
            )
          })}

          {heeftFilters && (
            <button
              onClick={onWisFilters}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium shrink-0 text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
            >
              <X size={13} />
              Wis filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
