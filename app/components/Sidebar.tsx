'use client'

import { Archive, Calendar, Folder, FolderMinus, Plus, Settings, StickyNote, Tag } from 'lucide-react'
import type { Weergave, NotitieMap } from '@/types'
import { GEEN_MAP_FILTER } from '@/types'

interface Props {
  weergave: Weergave
  mappen: NotitieMap[]
  actieveMapId: string | null   // null = geen mapfilter, GEEN_MAP_FILTER = zonder map
  onWeergaveChange: (w: Weergave) => void
  onKiesMap: (id: string | null) => void
  onLabels: () => void
  onMapBeheer: () => void
  onInstellingen: () => void
}

const itemKlasse = (actief: boolean) => [
  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors',
  actief ? 'bg-blue-50 text-[#007AFF]' : 'text-gray-700 hover:bg-gray-100',
].join(' ')

// Desktop-sidebar (verborgen op mobiel; daar neemt BottomBar de navigatie over).
// Mappen staan als eigen sectie onder de navigatie: klik = filteren op die map.
export default function Sidebar({
  weergave, mappen, actieveMapId,
  onWeergaveChange, onKiesMap, onLabels, onMapBeheer, onInstellingen,
}: Props) {
  const items: {
    key: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    actief: boolean
    onClick: () => void
  }[] = [
    { key: 'alle',         label: 'Alle notities', icon: StickyNote, actief: weergave === 'alle' && actieveMapId === null, onClick: () => onKiesMap(null) },
    { key: 'labels',       label: 'Labels',        icon: Tag,        actief: false,                  onClick: onLabels },
    { key: 'archief',      label: 'Archief',       icon: Archive,    actief: weergave === 'archief', onClick: () => onWeergaveChange('archief') },
    { key: 'instellingen', label: 'Instellingen',  icon: Settings,   actief: false,                  onClick: onInstellingen },
  ]

  const mapActief = (id: string) => weergave === 'alle' && actieveMapId === id

  return (
    <aside className="hidden sm:flex flex-col w-60 shrink-0 border-r border-gray-200 bg-white">
      {/* App-naam */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-gray-200">
        <StickyNote size={18} className="text-[#007AFF]" />
        <span className="text-[15px] font-semibold text-gray-900">Notities</span>
      </div>

      {/* Navigatie */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {items.map(({ key, label, icon: Icon, actief, onClick }) => (
          <button key={key} onClick={onClick} className={itemKlasse(actief)}>
            <Icon size={18} className={actief ? 'text-[#007AFF]' : 'text-gray-400'} />
            {label}
          </button>
        ))}

        {/* Mappen — klik filtert; ＋ opent het beheer */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Mappen</span>
            <button
              onClick={onMapBeheer}
              aria-label="Mappen beheren"
              className="p-1 -m-1 text-gray-400 hover:text-[#007AFF] transition-colors rounded"
            >
              <Plus size={15} />
            </button>
          </div>

          {mappen.length === 0 ? (
            <button
              onClick={onMapBeheer}
              className="w-full px-3 py-2 rounded-lg text-[13px] text-gray-400 text-left hover:bg-gray-100 transition-colors"
            >
              Nieuwe map…
            </button>
          ) : (
            <div className="space-y-0.5">
              <button onClick={() => onKiesMap(GEEN_MAP_FILTER)} className={itemKlasse(mapActief(GEEN_MAP_FILTER))}>
                <FolderMinus size={18} className={mapActief(GEEN_MAP_FILTER) ? 'text-[#007AFF]' : 'text-gray-400'} />
                <span className="truncate">Geen map</span>
              </button>
              {mappen.map(map => (
                <button key={map.id} onClick={() => onKiesMap(map.id)} className={itemKlasse(mapActief(map.id))}>
                  <Folder size={18} className={`shrink-0 ${mapActief(map.id) ? 'text-[#007AFF]' : 'text-gray-400'}`} />
                  <span className="truncate">{map.naam}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Externe link naar de agenda-app */}
      <div className="p-2 border-t border-gray-200">
        <a
          href="https://agenda.jellebol.nl"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Calendar size={18} className="text-gray-400" />
          Agenda
        </a>
      </div>
    </aside>
  )
}
