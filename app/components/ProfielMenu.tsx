'use client'

import { LogOut, Settings, X } from 'lucide-react'

interface Props {
  open: boolean
  email: string
  onInstellingen: () => void
  onUitloggen: () => void
  onSluit: () => void
}

export default function ProfielMenu({ open, email, onInstellingen, onUitloggen, onSluit }: Props) {
  if (!open) return null

  const prefix = email.split('@')[0] ?? ''
  const naam   = prefix.charAt(0).toUpperCase() + prefix.slice(1)
  const initiaal = naam[0] ?? '?'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end p-0 sm:p-2 sm:pt-14">
      <div className="absolute inset-0 bg-black/20" onClick={onSluit} />

      <div className="relative w-full sm:w-72 bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900">Profiel</h2>
          <button onClick={onSluit} className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Avatar + info */}
        <div className="flex flex-col items-center gap-2 px-4 py-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-[#007AFF] flex items-center justify-center text-white text-2xl font-bold select-none">
            {initiaal}
          </div>
          <p className="text-[17px] font-semibold text-gray-900">{naam}</p>
          <p className="text-[13px] text-gray-400">{email}</p>
        </div>

        {/* Instellingen */}
        <div className="px-4 pt-4 pb-0">
          <button
            onClick={() => { onInstellingen(); onSluit() }}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
          >
            <Settings size={16} />
            Instellingen
          </button>
        </div>

        {/* Uitloggen */}
        <div className="p-4">
          <button
            onClick={() => { onUitloggen(); onSluit() }}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
          >
            <LogOut size={16} />
            Uitloggen
          </button>
        </div>
      </div>
    </div>
  )
}
