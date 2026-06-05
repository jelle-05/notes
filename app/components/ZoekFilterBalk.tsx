'use client'

import { Check, Folder, Search, X } from 'lucide-react'
import type { Label } from '@/types'
import { eventKleuren } from '@/lib/kleuren'

interface Props {
  zoekterm: string
  onZoek: (term: string) => void
  labels: Label[]
  actieveLabelIds: string[]
  mapFilterNaam: string | null   // mapnaam of "Geen map"; null = geen mapfilter
  onToggleLabel: (id: string) => void
  onWisMapFilter: () => void
  onWisFilters: () => void
}

// Zoekveld + filterpills boven het notitie-grid. Filteren is volledig
// client-side (afgeleide state in NotesApp); meerdere actieve labels = OR,
// het mapfilter werkt als AND met de rest.
export default function ZoekFilterBalk({
  zoekterm, onZoek, labels, actieveLabelIds, mapFilterNaam,
  onToggleLabel, onWisMapFilter, onWisFilters,
}: Props) {
  const heeftFilters = zoekterm.trim() !== '' || actieveLabelIds.length > 0 || mapFilterNaam !== null

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

      {/* Filterpills (horizontaal scrollbaar bij veel labels) */}
      {(labels.length > 0 || mapFilterNaam !== null) && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 [-webkit-overflow-scrolling:touch]">
          {/* Actieve mapfilter als chip vooraan */}
          {mapFilterNaam !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#007AFF]/30 bg-blue-50 px-3 py-1.5 text-[13px] font-semibold text-[#007AFF] shrink-0">
              <Folder size={13} className="shrink-0" />
              <span className="truncate max-w-[140px]">{mapFilterNaam}</span>
              <button
                onClick={onWisMapFilter}
                aria-label="Wis mapfilter"
                className="shrink-0 -mr-1 p-0.5 opacity-70 hover:opacity-100 transition-opacity"
              >
                <X size={13} />
              </button>
            </span>
          )}

          {labels.map(label => {
            const actief = actieveLabelIds.includes(label.id)
            const kleuren = eventKleuren(label)
            return (
              <button
                key={label.id}
                onClick={() => onToggleLabel(label.id)}
                aria-pressed={actief}
                className={[
                  // Border i.p.v. ring: een ring (box-shadow) wordt afgekapt door overflow-x-auto.
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] shrink-0 transition',
                  actief
                    ? 'font-semibold'
                    : 'font-medium bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                ].join(' ')}
                style={actief ? { backgroundColor: kleuren.achtergrond, color: kleuren.tekst, borderColor: kleuren.tekst } : undefined}
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
