'use client'

import { Archive, Calendar, Folder, Settings, StickyNote, Tag } from 'lucide-react'
import type { Weergave } from '@/types'

interface Props {
  weergave: Weergave
  onWeergaveChange: (w: Weergave) => void
  onLabels: () => void
  onMappen: () => void
  onInstellingen: () => void
}

// Desktop-sidebar (verborgen op mobiel; daar neemt BottomBar de navigatie over).
export default function Sidebar({ weergave, onWeergaveChange, onLabels, onMappen, onInstellingen }: Props) {
  const items: {
    key: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    actief: boolean
    onClick: () => void
  }[] = [
    { key: 'alle',         label: 'Alle notities', icon: StickyNote, actief: weergave === 'alle',    onClick: () => onWeergaveChange('alle') },
    { key: 'labels',       label: 'Labels',        icon: Tag,        actief: false,                  onClick: onLabels },
    { key: 'mappen',       label: 'Mappen',        icon: Folder,     actief: weergave === 'map',     onClick: onMappen },
    { key: 'archief',      label: 'Archief',       icon: Archive,    actief: weergave === 'archief', onClick: () => onWeergaveChange('archief') },
    { key: 'instellingen', label: 'Instellingen',  icon: Settings,   actief: false,                  onClick: onInstellingen },
  ]

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
          <button
            key={key}
            onClick={onClick}
            className={[
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors',
              actief ? 'bg-blue-50 text-[#007AFF]' : 'text-gray-700 hover:bg-gray-100',
            ].join(' ')}
          >
            <Icon size={18} className={actief ? 'text-[#007AFF]' : 'text-gray-400'} />
            {label}
          </button>
        ))}
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
