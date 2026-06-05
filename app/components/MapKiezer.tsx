'use client'

import { Check, FolderMinus, Pencil, StickyNote } from 'lucide-react'
import type { NotitieMap } from '@/types'
import { GEEN_MAP_FILTER } from '@/types'
import { useEscape } from '@/lib/useEscape'
import MapIcoon from './MapIcoon'

interface Props {
  open: boolean
  mappen: NotitieMap[]
  actieveMapId: string | null   // null = alle notities, GEEN_MAP_FILTER = zonder map
  onKies: (id: string | null) => void
  onBeheer: () => void
  onSluit: () => void
}

// Mobiele mappen-sheet (vanaf de Mappen-tab in de BottomBar): kies een
// mapfilter of open het mappenbeheer. Op desktop staat dezelfde lijst in de
// Sidebar; deze sheet werkt daar ook, maar wordt alleen mobiel geopend.
export default function MapKiezer({ open, mappen, actieveMapId, onKies, onBeheer, onSluit }: Props) {
  useEscape(open, onSluit)
  if (!open) return null

  function rij(label: string, icon: React.ReactNode, actief: boolean, onClick: () => void) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-100 transition-colors"
      >
        {icon}
        <span className={`flex-1 text-[15px] text-left truncate ${actief ? 'font-semibold text-[#007AFF]' : 'text-gray-900'}`}>
          {label}
        </span>
        {actief && <Check size={16} className="text-[#007AFF] shrink-0" />}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div role="dialog" aria-modal="true" aria-label="Mappen kiezen" className="relative w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-20" />
          <h2 className="text-[15px] font-semibold text-gray-900">Mappen</h2>
          <button onClick={onSluit} className="text-[#007AFF] text-sm font-semibold w-20 text-right">
            Gereed
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3 modal-safe-bottom">
          <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
            {rij(
              'Alle notities',
              <StickyNote size={18} className="text-gray-400 shrink-0" />,
              actieveMapId === null,
              () => onKies(null),
            )}
            {mappen.length > 0 && rij(
              'Geen map',
              <FolderMinus size={18} className="text-gray-400 shrink-0" />,
              actieveMapId === GEEN_MAP_FILTER,
              () => onKies(GEEN_MAP_FILTER),
            )}
            {mappen.map(map => rij(
              map.naam,
              <MapIcoon map={map} />,
              actieveMapId === map.id,
              () => onKies(map.id),
            ))}
            {mappen.length === 0 && (
              <div className="px-4 py-5 text-sm text-gray-400 text-center">
                Maak een map aan om notities te organiseren.
              </div>
            )}
          </div>

          {/* Mappen beheren */}
          <button
            onClick={onBeheer}
            className="flex items-center gap-3 w-full bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors"
          >
            <Pencil size={16} className="text-[#007AFF] shrink-0" />
            <span className="text-[15px] text-[#007AFF]">Mappen beheren</span>
          </button>
        </div>
      </div>
    </div>
  )
}
