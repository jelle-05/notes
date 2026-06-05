'use client'

import { useState, useEffect, useRef } from 'react'
import { Ban, ChevronRight, Plus } from 'lucide-react'
import type { NotitieMap } from '@/types'
import { nieuweMap } from '@/lib/helpers'
import { useEscape } from '@/lib/useEscape'
import MapIcoon from './MapIcoon'

// Zelfde 12 iOS-preset-kleuren als LabelBeheer.
const PRESET_KLEUREN = [
  '#FF3B30', '#FF6B00', '#FF9500', '#FFCC00',
  '#34C759', '#00C7BE', '#32ADE6', '#007AFF',
  '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93',
]

interface Props {
  open: boolean
  mappen: NotitieMap[]
  aantalPerMap: Record<string, number>   // aantal notities per map-id (incl. gearchiveerde)
  startMap?: NotitieMap | null           // direct in bewerk-modus openen (⋯ in de sidebar)
  onOpslaan: (map: NotitieMap) => void
  onVerwijder: (id: string) => void
  onSluit: () => void
}

// Mappenbeheer — zelfde modal-patroon als LabelBeheer (lijst ↔ bewerk): naam +
// optionele kleur (kleurt het ronde mapicoon). Verwijderen is twee-staps;
// de notities in de map blijven altijd bestaan (ze verhuizen naar "Geen map").
export default function MapBeheer({ open, mappen, aantalPerMap, startMap, onOpslaan, onVerwijder, onSluit }: Props) {
  const [modus, setModus] = useState<'lijst' | 'bewerk'>('lijst')
  const [bewerk, setBewerk] = useState<Partial<NotitieMap>>({})
  const [verwijderBevestig, setVerwijderBevestig] = useState(false)
  const bevestigTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (bevestigTimer.current) clearTimeout(bevestigTimer.current) }, [])

  // Bij openen direct de juiste weergave tonen: bewerk (via ⋯ achter een map
  // in de sidebar) of de lijst (via ＋ / "Mappen beheren").
  useEffect(() => {
    if (!open) return
    // Bewuste reset bij elke (her)opening van de modal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModus(startMap ? 'bewerk' : 'lijst')
    setBewerk(startMap ? { ...startMap } : {})
    setVerwijderBevestig(false)
  }, [open, startMap])

  useEscape(open, onSluit)

  if (!open) return null

  const isNieuw = !bewerk.id
  const aantalInMap = bewerk.id ? (aantalPerMap[bewerk.id] ?? 0) : 0

  function openNieuw() {
    setBewerk({ naam: '' })
    setVerwijderBevestig(false)
    setModus('bewerk')
  }

  function openBewerk(map: NotitieMap) {
    setBewerk({ ...map })
    setVerwijderBevestig(false)
    setModus('bewerk')
  }

  function terug() {
    setModus('lijst')
    setBewerk({})
    setVerwijderBevestig(false)
  }

  // Lege namen worden geblokkeerd (Bewaar disabled + return hier); whitespace
  // wordt getrimd. Dubbele namen zijn — net als bij labels — bewust toegestaan.
  function opslaan() {
    const naam = bewerk.naam?.trim()
    if (!naam) return
    onOpslaan(
      bewerk.id
        ? { id: bewerk.id, naam, kleur: bewerk.kleur, aangemaaktOp: bewerk.aangemaaktOp! }
        : { ...nieuweMap(naam), kleur: bewerk.kleur }
    )
    terug()
  }

  // Twee-staps bevestiging tegen per-ongeluk-verwijderen.
  function verwijderKlik() {
    if (!verwijderBevestig) {
      setVerwijderBevestig(true)
      bevestigTimer.current = setTimeout(() => setVerwijderBevestig(false), 3000)
      return
    }
    if (bevestigTimer.current) clearTimeout(bevestigTimer.current)
    onVerwijder(bewerk.id!)
    terug()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div role="dialog" aria-modal="true" aria-label="Mappen" className="relative w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          {modus === 'bewerk' ? (
            <>
              <button onClick={terug} className="text-[#007AFF] text-sm font-medium w-20">
                ← Terug
              </button>
              <h2 className="text-[15px] font-semibold text-gray-900">
                {isNieuw ? 'Nieuwe map' : 'Bewerk map'}
              </h2>
              <button
                onClick={opslaan}
                disabled={!bewerk.naam?.trim()}
                className="text-[#007AFF] text-sm font-semibold w-20 text-right disabled:opacity-40"
              >
                Bewaar
              </button>
            </>
          ) : (
            <>
              <div className="w-20" />
              <h2 className="text-[15px] font-semibold text-gray-900">Mappen</h2>
              <button onClick={onSluit} className="text-[#007AFF] text-sm font-semibold w-20 text-right">
                Gereed
              </button>
            </>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3 modal-safe-bottom">
          {modus === 'lijst' ? (
            <>
              {/* Mappenlijst */}
              <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                {mappen.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-400 text-center">
                    Nog geen mappen — maak een map aan om notities te organiseren.
                  </div>
                ) : (
                  mappen.map(map => {
                    const aantal = aantalPerMap[map.id] ?? 0
                    return (
                      <button
                        key={map.id}
                        onClick={() => openBewerk(map)}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-100 transition-colors"
                      >
                        <MapIcoon map={map} />
                        <span className="flex-1 text-[15px] text-gray-900 text-left truncate">{map.naam}</span>
                        {aantal > 0 && (
                          <span className="text-[13px] text-gray-400 tabular-nums shrink-0">{aantal}</span>
                        )}
                        <ChevronRight size={16} className="text-gray-400 shrink-0" />
                      </button>
                    )
                  })
                )}
              </div>

              {/* Nieuwe map */}
              <button
                onClick={openNieuw}
                className="flex items-center gap-3 w-full bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-[#007AFF] flex items-center justify-center shrink-0">
                  <Plus size={12} className="text-white" />
                </span>
                <span className="text-[15px] text-[#007AFF]">Nieuwe map</span>
              </button>
            </>
          ) : (
            <>
              {/* Naam */}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <input
                  type="text"
                  value={bewerk.naam ?? ''}
                  onChange={e => setBewerk(m => ({ ...m, naam: e.target.value }))}
                  placeholder="Mapnaam"
                  autoFocus
                  className="w-full text-[17px] font-medium placeholder:text-gray-300 outline-none bg-transparent"
                  onKeyDown={e => e.key === 'Enter' && opslaan()}
                />
              </div>

              {/* Kleur (optioneel) — kleurt het ronde mapicoon */}
              <div className="bg-gray-50 rounded-xl px-4 py-4">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-3">Kleur</p>
                <div className="grid grid-cols-6 gap-3">
                  <button
                    onClick={() => setBewerk(m => ({ ...m, kleur: undefined }))}
                    aria-label="Geen kleur"
                    className={[
                      'w-9 h-9 rounded-full border border-gray-300 bg-white flex items-center justify-center transition-all',
                      !bewerk.kleur ? 'scale-110 ring-2 ring-offset-2 ring-gray-500' : 'hover:scale-105',
                    ].join(' ')}
                  >
                    <Ban size={16} className="text-gray-300" />
                  </button>
                  {PRESET_KLEUREN.map(kleur => (
                    <button
                      key={kleur}
                      onClick={() => setBewerk(m => ({ ...m, kleur }))}
                      aria-label={`Kleur ${kleur}`}
                      className={[
                        'w-9 h-9 rounded-full transition-all',
                        bewerk.kleur === kleur ? 'scale-110 ring-2 ring-offset-2 ring-gray-500' : 'hover:scale-105',
                      ].join(' ')}
                      style={{ backgroundColor: kleur }}
                    />
                  ))}
                </div>

                {/* Voorbeeld (pl compenseert de uitlijn-marge van MapIcoon) */}
                {bewerk.kleur && (
                  <div className="flex items-center gap-2.5 mt-4 pl-[5px]">
                    <MapIcoon map={bewerk} size={28} />
                    <span className="text-[14px] text-gray-700 truncate">{bewerk.naam?.trim() || 'Mapnaam'}</span>
                  </div>
                )}
              </div>

              {/* Verwijderen — twee-staps; notities verhuizen naar "Geen map" */}
              {!isNieuw && (
                <>
                  <p className="text-[12px] text-gray-400 px-1">
                    {aantalInMap > 0
                      ? `Deze map bevat ${aantalInMap} notitie${aantalInMap === 1 ? '' : 's'}. Bij verwijderen blijven die bestaan en verhuizen ze naar Geen map.`
                      : 'Deze map is leeg.'}
                  </p>
                  <button
                    onClick={verwijderKlik}
                    className={[
                      'w-full rounded-xl py-3 text-[15px] font-medium transition-colors',
                      verwijderBevestig
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-red-50 text-red-500 hover:bg-red-100',
                    ].join(' ')}
                  >
                    {verwijderBevestig ? 'Zeker weten?' : 'Verwijder map'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
