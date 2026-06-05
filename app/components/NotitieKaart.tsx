'use client'

import { Circle, CheckCircle2, FileText, ListChecks } from 'lucide-react'
import type { Notitie, Label } from '@/types'
import { formatDatumKort } from '@/lib/helpers'
import { eventKleuren } from '@/lib/kleuren'
import LabelPill from './LabelPill'

interface Props {
  notitie: Notitie
  labels: Label[]
  onOpen: (notitie: Notitie) => void
  onLabelKlik?: (id: string) => void   // pill-klik = filteren op dat label
}

const PREVIEW_ITEMS = 3
const MAX_PILLS = 3

// Kaart in het notitie-grid: titel + korte preview + label-pills, iOS-stijl.
// Het kaart-element is een div met role="button" (geen <button>): de pills
// erin zijn zelf buttons en geneste buttons zijn invalid HTML.
export default function NotitieKaart({ notitie, labels, onOpen, onLabelKlik }: Props) {
  const isLijst = notitie.type === 'lijst'
  const afgevinkt = notitie.items.filter(i => i.afgevinkt).length
  const TypeIcon = isLijst ? ListChecks : FileText

  // Gekoppelde labels opzoeken; verwijderde/onbekende ids stil overslaan.
  const kaartLabels = notitie.labelIds
    .map(id => labels.find(l => l.id === id))
    .filter((l): l is Label => l !== undefined)

  // Het eerste label bepaalt de kaartkleur (kiesbaar in de detailweergave bij
  // 2+ labels). Zonder labels blijft de kaart wit.
  const kleurLabel = kaartLabels[0]
  const kaartKleuren = kleurLabel ? eventKleuren(kleurLabel) : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(notitie)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(notitie) }
      }}
      className={[
        'cursor-pointer text-left w-full rounded-2xl border p-4 flex flex-col gap-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]',
        kaartKleuren
          ? 'border-black/5'
          : 'bg-white border-gray-200 hover:border-gray-300 active:bg-gray-50',
      ].join(' ')}
      style={kaartKleuren ? { backgroundColor: kaartKleuren.achtergrond } : undefined}
    >
      {/* Titel */}
      <h3
        className={[
          'text-[15px] font-semibold truncate',
          kaartKleuren
            ? (notitie.titel.trim() ? '' : 'opacity-50')
            : (notitie.titel.trim() ? 'text-gray-900' : 'text-gray-400'),
        ].join(' ')}
        style={kaartKleuren ? { color: kaartKleuren.tekst } : undefined}
      >
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
                  : <Circle
                      size={14}
                      className={`shrink-0 ${kaartKleuren ? 'opacity-30' : 'text-gray-300'}`}
                      style={kaartKleuren ? { color: kaartKleuren.tekst } : undefined}
                    />}
                <span
                  className={[
                    'text-[13px] truncate',
                    kaartKleuren
                      ? (item.afgevinkt ? 'opacity-50 line-through' : 'opacity-80')
                      : (item.afgevinkt ? 'text-gray-400 line-through' : 'text-gray-600'),
                  ].join(' ')}
                  style={kaartKleuren ? { color: kaartKleuren.tekst } : undefined}
                >
                  {item.tekst.trim() || '…'}
                </span>
              </li>
            ))}
            {notitie.items.length > PREVIEW_ITEMS && (
              <li
                className={`text-[12px] pl-[20px] ${kaartKleuren ? 'opacity-60' : 'text-gray-400'}`}
                style={kaartKleuren ? { color: kaartKleuren.tekst } : undefined}
              >
                +{notitie.items.length - PREVIEW_ITEMS} meer
              </li>
            )}
          </ul>
        )
      ) : (
        notitie.inhoud.trim() && (
          <p
            className={`text-[13px] line-clamp-4 whitespace-pre-line ${kaartKleuren ? 'opacity-80' : 'text-gray-600'}`}
            style={kaartKleuren ? { color: kaartKleuren.tekst } : undefined}
          >
            {notitie.inhoud.trim()}
          </p>
        )
      )}

      {/* Labels */}
      {kaartLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {kaartLabels.slice(0, MAX_PILLS).map(label => (
            <LabelPill
              key={label.id}
              label={label}
              onClick={onLabelKlik ? () => onLabelKlik(label.id) : undefined}
              opKleur={kaartKleuren !== null}
            />
          ))}
          {kaartLabels.length > MAX_PILLS && (
            <span
              className={`text-[11px] font-medium ${kaartKleuren ? 'opacity-60' : 'text-gray-400'}`}
              style={kaartKleuren ? { color: kaartKleuren.tekst } : undefined}
            >
              +{kaartLabels.length - MAX_PILLS}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className={`flex items-center gap-1.5 text-[12px] mt-auto pt-1 ${kaartKleuren ? 'opacity-70' : 'text-gray-400'}`}
        style={kaartKleuren ? { color: kaartKleuren.tekst } : undefined}
      >
        <TypeIcon size={13} className="shrink-0" />
        {isLijst && <span>{afgevinkt}/{notitie.items.length}</span>}
        <span className="ml-auto">{formatDatumKort(notitie.gewijzigdOp)}</span>
      </div>
    </div>
  )
}
