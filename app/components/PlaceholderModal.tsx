'use client'

import { X } from 'lucide-react'

interface Props {
  open: boolean
  titel: string
  tekst: string
  onSluit: () => void
}

// Tijdelijke modal voor functionaliteit uit latere fases (zie fases.md).
// Volgt het vaste modal-patroon: bottom-sheet op mobiel, gecentreerd op desktop.
export default function PlaceholderModal({ open, titel, tekst, onSluit }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900">{titel}</h2>
          <button onClick={onSluit} className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Inhoud */}
        <div className="px-6 py-8 text-center safe-area-bottom">
          <p className="text-[14px] text-gray-500 leading-relaxed">{tekst}</p>
        </div>
      </div>
    </div>
  )
}
