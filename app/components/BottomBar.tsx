'use client'

import { Archive, Calendar, Folder, StickyNote } from 'lucide-react'
import type { Weergave } from '@/types'

interface Props {
  weergave: Weergave
  onWeergaveChange: (w: Weergave) => void
  onMappen: () => void
}

// Mobiele navigatiebalk (verborgen op desktop; daar neemt de Sidebar het over).
export default function BottomBar({ weergave, onWeergaveChange, onMappen }: Props) {
  const knopKlasse = (actief: boolean) =>
    [
      'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
      actief ? 'text-[#007AFF]' : 'text-gray-400',
    ].join(' ')

  return (
    <nav className="sm:hidden flex items-stretch border-t border-gray-200 bg-white shrink-0 safe-area-bottom">
      <button onClick={() => onWeergaveChange('alle')} className={knopKlasse(weergave === 'alle')}>
        <StickyNote size={22} className={weergave === 'alle' ? 'text-[#007AFF]' : 'text-gray-400'} />
        Notities
      </button>

      <button onClick={onMappen} className={knopKlasse(weergave === 'map')}>
        <Folder size={22} className={weergave === 'map' ? 'text-[#007AFF]' : 'text-gray-400'} />
        Mappen
      </button>

      <button onClick={() => onWeergaveChange('archief')} className={knopKlasse(weergave === 'archief')}>
        <Archive size={22} className={weergave === 'archief' ? 'text-[#007AFF]' : 'text-gray-400'} />
        Archief
      </button>

      {/* Externe link naar de agenda-app */}
      <a href="https://agenda.jellebol.nl" className={knopKlasse(false)}>
        <Calendar size={22} className="text-gray-400" />
        Agenda
      </a>
    </nav>
  )
}
