'use client'

import { Plus } from 'lucide-react'

interface Props {
  titel: string
  onNieuw: () => void
  onProfielMenu: () => void
  gebruikerEmail?: string
}

export default function TopBar({ titel, onNieuw, onProfielMenu, gebruikerEmail }: Props) {
  return (
    <header className="flex items-center justify-between px-3 h-12 border-b border-gray-200 bg-white shrink-0 gap-2">
      <h1 className="text-[15px] font-semibold text-gray-900 truncate min-w-0">{titel}</h1>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onNieuw}
          aria-label="Nieuwe notitie"
          className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={onProfielMenu}
          aria-label="Profiel"
          className="w-7 h-7 rounded-full bg-[#007AFF] text-white text-[11px] font-bold flex items-center justify-center"
        >
          {gebruikerEmail?.[0]?.toUpperCase() ?? '?'}
        </button>
      </div>
    </header>
  )
}
