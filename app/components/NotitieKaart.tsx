'use client'

import { Circle, CheckCircle2, FileText, ListChecks } from 'lucide-react'
import type { Notitie } from '@/types'
import { formatDatumKort } from '@/lib/helpers'

interface Props {
  notitie: Notitie
  onOpen: (notitie: Notitie) => void
}

const PREVIEW_ITEMS = 3

// Kaart in het notitie-grid: titel + korte preview, iOS-stijl.
export default function NotitieKaart({ notitie, onOpen }: Props) {
  const isLijst = notitie.type === 'lijst'
  const afgevinkt = notitie.items.filter(i => i.afgevinkt).length
  const TypeIcon = isLijst ? ListChecks : FileText

  return (
    <button
      onClick={() => onOpen(notitie)}
      className="text-left w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2 hover:shadow hover:border-gray-300 active:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
    >
      {/* Titel */}
      <h3 className={`text-[15px] font-semibold truncate ${notitie.titel.trim() ? 'text-gray-900' : 'text-gray-400'}`}>
        {notitie.titel.trim() || 'Zonder titel'}
      </h3>

      {/* Preview */}
      {isLijst ? (
        notitie.items.length > 0 && (
          <ul className="space-y-1">
            {notitie.items.slice(0, PREVIEW_ITEMS).map(item => (
              <li key={item.id} className="flex items-center gap-1.5 min-w-0">
                {item.afgevinkt
                  ? <CheckCircle2 size={14} className="text-[#007AFF] shrink-0" />
                  : <Circle size={14} className="text-gray-300 shrink-0" />}
                <span className={`text-[13px] truncate ${item.afgevinkt ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                  {item.tekst.trim() || '…'}
                </span>
              </li>
            ))}
            {notitie.items.length > PREVIEW_ITEMS && (
              <li className="text-[12px] text-gray-400 pl-[20px]">
                +{notitie.items.length - PREVIEW_ITEMS} meer
              </li>
            )}
          </ul>
        )
      ) : (
        notitie.inhoud.trim() && (
          <p className="text-[13px] text-gray-600 line-clamp-4 whitespace-pre-line">
            {notitie.inhoud.trim()}
          </p>
        )
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mt-auto pt-1">
        <TypeIcon size={13} className="shrink-0" />
        {isLijst && <span>{afgevinkt}/{notitie.items.length}</span>}
        <span className="ml-auto">{formatDatumKort(notitie.gewijzigdOp)}</span>
      </div>
    </button>
  )
}
