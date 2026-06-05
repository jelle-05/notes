'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import type { Label } from '@/types'
import { contrastRatio, eventKleuren, hex6Van, alphaVan, metAlpha } from '@/lib/kleuren'
import { useEscape } from '@/lib/useEscape'

const PRESET_KLEUREN = [
  '#FF3B30', '#FF6B00', '#FF9500', '#FFCC00',
  '#34C759', '#00C7BE', '#32ADE6', '#007AFF',
  '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93',
]

interface Props {
  open: boolean
  labels: Label[]
  onOpslaan: (label: Label) => void
  onVerwijder: (id: string) => void
  onSluit: () => void
}

// Labelbeheer — overgenomen uit de agenda-app; aangepast: pill-preview en
// twee-staps verwijderbevestiging (consistent met NotitieDetail).
export default function LabelBeheer({ open, labels, onOpslaan, onVerwijder, onSluit }: Props) {
  const [modus, setModus] = useState<'lijst' | 'bewerk'>('lijst')
  const [bewerk, setBewerk] = useState<Partial<Label>>({})
  const [verwijderBevestig, setVerwijderBevestig] = useState(false)
  const bevestigTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (bevestigTimer.current) clearTimeout(bevestigTimer.current) }, [])
  useEscape(open, onSluit)

  if (!open) return null

  const isNieuw = !bewerk.id

  function openNieuw() {
    setBewerk({ naam: '', kleur: '#007AFF' })
    setVerwijderBevestig(false)
    setModus('bewerk')
  }

  function openBewerk(label: Label) {
    setBewerk({ ...label })
    setVerwijderBevestig(false)
    setModus('bewerk')
  }

  function terug() {
    setModus('lijst')
    setBewerk({})
    setVerwijderBevestig(false)
  }

  function opslaan() {
    if (!bewerk.naam?.trim()) return
    onOpslaan({
      id: bewerk.id || crypto.randomUUID(),
      naam: bewerk.naam.trim(),
      kleur: bewerk.kleur || '#007AFF',
      achtergrondKleur: bewerk.achtergrondKleur,
      tekstKleur: bewerk.tekstKleur,
    })
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

  // Eigen kleuren staan aan zodra een achtergrondkleur is ingesteld.
  const eigenKleuren = bewerk.achtergrondKleur != null
  function setEigenKleuren(aan: boolean) {
    if (aan) setBewerk(l => ({ ...l, achtergrondKleur: l.kleur || '#007AFF', tekstKleur: '#FFFFFF' }))
    else setBewerk(l => ({ ...l, achtergrondKleur: undefined, tekstKleur: undefined }))
  }
  const contrastLaag = eigenKleuren
    && contrastRatio(bewerk.achtergrondKleur || '#FFFFFF', bewerk.tekstKleur || '#000000') < 3

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div role="dialog" aria-modal="true" aria-label="Labels" className="relative w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          {modus === 'bewerk' ? (
            <>
              <button onClick={terug} className="text-[#007AFF] text-sm font-medium w-20">
                ← Terug
              </button>
              <h2 className="text-[15px] font-semibold text-gray-900">
                {isNieuw ? 'Nieuw label' : 'Bewerk label'}
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
              <h2 className="text-[15px] font-semibold text-gray-900">Labels</h2>
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
              {/* Label lijst */}
              <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                {labels.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-400 text-center">Nog geen labels</div>
                ) : (
                  labels.map(label => (
                    <button
                      key={label.id}
                      onClick={() => openBewerk(label)}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: label.kleur }} />
                      <span className="flex-1 text-[15px] text-gray-900 text-left truncate">{label.naam}</span>
                      <ChevronRight size={16} className="text-gray-400 shrink-0" />
                    </button>
                  ))
                )}
              </div>

              {/* Nieuw label */}
              <button
                onClick={openNieuw}
                className="flex items-center gap-3 w-full bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-[#007AFF] flex items-center justify-center shrink-0">
                  <Plus size={12} className="text-white" />
                </span>
                <span className="text-[15px] text-[#007AFF]">Nieuw label</span>
              </button>
            </>
          ) : (
            <>
              {/* Naam */}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <input
                  type="text"
                  value={bewerk.naam ?? ''}
                  onChange={e => setBewerk(l => ({ ...l, naam: e.target.value }))}
                  placeholder="Labelnaam"
                  className="w-full text-[17px] font-medium placeholder:text-gray-300 outline-none bg-transparent"
                  onKeyDown={e => e.key === 'Enter' && opslaan()}
                />
              </div>

              {/* Kleur */}
              <div className="bg-gray-50 rounded-xl px-4 py-4">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-3">Kleur</p>
                <div className="grid grid-cols-6 gap-3">
                  {PRESET_KLEUREN.map(kleur => (
                    <button
                      key={kleur}
                      onClick={() => setBewerk(l => ({ ...l, kleur }))}
                      aria-label={`Kleur ${kleur}`}
                      className={[
                        'w-9 h-9 rounded-full transition-all',
                        bewerk.kleur === kleur ? 'scale-110 ring-2 ring-offset-2 ring-gray-500' : 'hover:scale-105',
                      ].join(' ')}
                      style={{ backgroundColor: kleur }}
                    />
                  ))}
                </div>
              </div>

              {/* Eigen achtergrond-/tekstkleur */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] text-gray-800">Eigen achtergrond/tekstkleur</span>
                  <button
                    onClick={() => setEigenKleuren(!eigenKleuren)}
                    className={['relative w-12 h-7 rounded-full transition-colors', eigenKleuren ? 'bg-[#34C759]' : 'bg-gray-300'].join(' ')}
                    aria-label="Eigen kleuren"
                    aria-pressed={eigenKleuren}
                  >
                    <span className={['absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all', eigenKleuren ? 'left-[26px]' : 'left-[3px]'].join(' ')} />
                  </button>
                </div>

                {eigenKleuren && (
                  <div className="space-y-3">
                    {([
                      { naam: 'Achtergrond', veld: 'achtergrondKleur' as const, standaard: '#007AFF' },
                      { naam: 'Tekst',       veld: 'tekstKleur'       as const, standaard: '#FFFFFF' },
                    ]).map(({ naam, veld, standaard }) => {
                      const waarde = bewerk[veld] ?? standaard
                      const alpha = alphaVan(waarde)
                      return (
                        <div key={veld} className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] text-gray-600">{naam}</span>
                            <input
                              type="color"
                              value={hex6Van(waarde)}
                              onChange={e => setBewerk(l => ({ ...l, [veld]: metAlpha(e.target.value, alphaVan(l[veld] ?? standaard)) }))}
                              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                              aria-label={`${naam}kleur`}
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={Math.round(alpha * 100)}
                              onChange={e => setBewerk(l => ({ ...l, [veld]: metAlpha(hex6Van(l[veld] ?? standaard), Number(e.target.value) / 100) }))}
                              className="flex-1 accent-[#007AFF] cursor-pointer"
                              aria-label={`${naam} transparantie`}
                            />
                            <span className="text-[11px] text-gray-400 tabular-nums w-9 text-right">{Math.round(alpha * 100)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {contrastLaag && (
                  <p className="text-[12px] text-orange-500">Laag contrast — tekst mogelijk slecht leesbaar.</p>
                )}

                {/* Preview als pill (zoals op de notitiekaarten) */}
                {bewerk.naam && (() => {
                  const { achtergrond, tekst } = eventKleuren(bewerk as Label)
                  return (
                    <div className="pt-1">
                      <p className="text-[11px] text-gray-400 mb-1.5">Voorbeeld</p>
                      <span
                        className="inline-block rounded-full px-2.5 py-1 text-[12px] font-medium max-w-full truncate"
                        style={{ backgroundColor: achtergrond, color: tekst }}
                      >
                        {bewerk.naam}
                      </span>
                    </div>
                  )
                })()}
              </div>

              {/* Verwijder — twee-staps bevestiging; notes blijven altijd bestaan */}
              {!isNieuw && (
                <button
                  onClick={verwijderKlik}
                  className={[
                    'w-full rounded-xl py-3 text-[15px] font-medium transition-colors',
                    verwijderBevestig
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-red-50 text-red-500 hover:bg-red-100',
                  ].join(' ')}
                >
                  {verwijderBevestig ? 'Zeker weten?' : 'Verwijder label'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
