'use client'

import { FileText, ListChecks, X } from 'lucide-react'
import type { NotitieType } from '@/types'
import { useEscape } from '@/lib/useEscape'

interface Props {
  open: boolean
  onKies: (type: NotitieType) => void
  onSluit: () => void
}

// Keuzemodal bij ＋: gewone notitie of afvinkbare lijst.
export default function NieuwKeuze({ open, onKies, onSluit }: Props) {
  useEscape(open, onSluit)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div role="dialog" aria-modal="true" aria-label="Nieuw" className="relative w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900">Nieuw</h2>
          <button onClick={onSluit} aria-label="Sluiten" className="w-16 flex justify-end py-3 -my-3 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Keuzes — pb via calc: .safe-area-bottom zou een Tailwind-pb overschrijven (0px op desktop) */}
        <div className="px-4 pt-4 space-y-2" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => onKies('notitie')}
            className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3.5 text-left transition-colors"
          >
            <FileText size={20} className="text-[#007AFF] shrink-0" />
            <span>
              <span className="block text-[15px] font-medium text-gray-900">Notitie</span>
              <span className="block text-[13px] text-gray-400">Vrije tekst, bijvoorbeeld een idee of memo</span>
            </span>
          </button>

          <button
            onClick={() => onKies('lijst')}
            className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3.5 text-left transition-colors"
          >
            <ListChecks size={20} className="text-[#007AFF] shrink-0" />
            <span>
              <span className="block text-[15px] font-medium text-gray-900">Lijst</span>
              <span className="block text-[13px] text-gray-400">Afvinkbare items, bijvoorbeeld boodschappen</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
