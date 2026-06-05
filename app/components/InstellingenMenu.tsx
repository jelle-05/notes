'use client'

import { useState, useEffect } from 'react'
import type { Instellingen } from '@/types'
import { MIN_ARCHIEF_DAGEN, MAX_ARCHIEF_DAGEN, clampArchiefDagen } from '@/lib/archief'
import { useEscape } from '@/lib/useEscape'

interface Props {
  open: boolean
  instellingen: Instellingen
  onWijzig: (instellingen: Instellingen) => void
  onSluit: () => void
}

// Instellingen — iOS-stijl secties; wijzigingen worden direct opgeslagen
// (optimistisch lokaal + Supabase-upsert, geen Bewaar-knop — consistent met
// de rest van de app).
export default function InstellingenMenu({ open, instellingen, onWijzig, onSluit }: Props) {
  // Lokale tekst-state voor het dagenveld: commit (met validatie) bij blur/Enter.
  const [dagenTekst, setDagenTekst] = useState(String(instellingen.autoArchiefDagen))
  const [dagenHint, setDagenHint] = useState('')

  // Synchroniseer het invoerveld wanneer de modal opent of de waarde elders wijzigt.
  useEffect(() => {
    // Bewuste reset: het veld spiegelt de opgeslagen waarde.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDagenTekst(String(instellingen.autoArchiefDagen))
    setDagenHint('')
  }, [open, instellingen.autoArchiefDagen])

  useEscape(open, onSluit)

  if (!open) return null

  function toggleAutoArchief() {
    onWijzig({ ...instellingen, autoArchiefAan: !instellingen.autoArchiefAan })
  }

  // Valideer en sla het aantal dagen op; ongeldige invoer valt terug op de
  // huidige waarde, buiten bereik wordt geclampt (met korte uitleg).
  function commitDagen() {
    const geparsed = Number(dagenTekst.trim())
    if (dagenTekst.trim() === '' || !Number.isFinite(geparsed)) {
      setDagenTekst(String(instellingen.autoArchiefDagen))
      setDagenHint('Vul een aantal dagen in.')
      return
    }
    const geclampt = clampArchiefDagen(geparsed)
    setDagenTekst(String(geclampt))
    setDagenHint(geclampt !== Math.round(geparsed)
      ? `Aangepast naar ${geclampt} (toegestaan: ${MIN_ARCHIEF_DAGEN}–${MAX_ARCHIEF_DAGEN} dagen).`
      : '')
    if (geclampt !== instellingen.autoArchiefDagen) {
      onWijzig({ ...instellingen, autoArchiefDagen: geclampt })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div role="dialog" aria-modal="true" aria-label="Instellingen" className="relative w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-20" />
          <h2 className="text-[15px] font-semibold text-gray-900">Instellingen</h2>
          <button onClick={onSluit} className="text-[#007AFF] text-sm font-semibold w-20 text-right">
            Gereed
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3 modal-safe-bottom">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold px-1">Archief</p>

          <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
            {/* Toggle automatisch archiveren */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px] text-gray-800">Automatisch archiveren</span>
              <button
                onClick={toggleAutoArchief}
                aria-label="Automatisch archiveren"
                aria-pressed={instellingen.autoArchiefAan}
                className={[
                  'relative w-12 h-7 rounded-full transition-colors shrink-0',
                  instellingen.autoArchiefAan ? 'bg-[#34C759]' : 'bg-gray-300',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all',
                    instellingen.autoArchiefAan ? 'left-[26px]' : 'left-[3px]',
                  ].join(' ')}
                />
              </button>
            </div>

            {/* Periode (alleen relevant als de toggle aan staat) */}
            {instellingen.autoArchiefAan && (
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] text-gray-800">Archiveer na</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={MIN_ARCHIEF_DAGEN}
                      max={MAX_ARCHIEF_DAGEN}
                      value={dagenTekst}
                      onChange={e => { setDagenTekst(e.target.value); setDagenHint('') }}
                      onBlur={commitDagen}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitDagen() } }}
                      aria-label="Archiveer na (dagen)"
                      className="w-20 text-[15px] text-right bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#007AFF] tabular-nums"
                    />
                    <span className="text-[15px] text-gray-500">dagen</span>
                  </div>
                </div>
                {dagenHint && <p className="text-[12px] text-red-500">{dagenHint}</p>}
              </div>
            )}
          </div>

          {/* Uitleg + status */}
          <div className="px-1 space-y-1">
            <p className="text-[12px] text-gray-400 leading-relaxed">
              Actieve notities die langer dan deze periode niet zijn gewijzigd, worden
              automatisch naar het archief verplaatst.
            </p>
            <p className="text-[12px] text-gray-500 font-medium">
              {instellingen.autoArchiefAan
                ? `Notities ouder dan ${instellingen.autoArchiefDagen} dag${instellingen.autoArchiefDagen === 1 ? '' : 'en'} worden bij het openen van de app gearchiveerd.`
                : 'Staat uit — er wordt niets automatisch gearchiveerd.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
