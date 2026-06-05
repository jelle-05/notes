'use client'

import { useState, useEffect, useRef } from 'react'
import { Circle, CheckCircle2, Plus, Trash2, X } from 'lucide-react'
import type { Notitie, LijstItem } from '@/types'
import { metGewijzigdOp, nieuwLijstItem } from '@/lib/helpers'
import KopieerKnop from './KopieerKnop'

interface Props {
  notitie: Notitie
  onWijzig: (notitie: Notitie) => void
  onVerwijder: (id: string) => void
  onSluit: () => void
}

// Detailweergave/editor met auto-save (iOS Notes-stijl): elke wijziging wordt
// direct doorgegeven aan NotesApp (optimistisch lokaal + debounced Supabase).
// De draft is bewust onafhankelijk van props ná het openen, zodat een
// realtime-herlaad de open editor nooit overschrijft.
export default function NotitieDetail({ notitie, onWijzig, onVerwijder, onSluit }: Props) {
  const [draft, setDraft] = useState<Notitie>(() => ({ ...notitie, items: [...notitie.items] }))
  const [nieuwTekst, setNieuwTekst] = useState('')
  const [verwijderBevestig, setVerwijderBevestig] = useState(false)

  const nieuwItemRef    = useRef<HTMLInputElement>(null)
  const bevestigTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset de draft alleen wanneer een ándere notitie geopend wordt.
  useEffect(() => {
    // Bewuste draft-reset bij wisselen van notitie; de modal blijft gemount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft({ ...notitie, items: [...notitie.items] })
    setNieuwTekst('')
    setVerwijderBevestig(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notitie.id])

  useEffect(() => () => { if (bevestigTimer.current) clearTimeout(bevestigTimer.current) }, [])

  const isLijst = draft.type === 'lijst'

  // Centrale wijzig-functie: draft bijwerken + direct omhoog (auto-save).
  function wijzig(update: Partial<Notitie>) {
    setDraft(prev => {
      const nieuw = metGewijzigdOp({ ...prev, ...update })
      onWijzig(nieuw)
      return nieuw
    })
  }

  // ── Checklist-items ──────────────────────────────────────────────────────────

  function toggleItem(id: string) {
    wijzig({ items: draft.items.map(i => i.id === id ? { ...i, afgevinkt: !i.afgevinkt } : i) })
  }

  function wijzigItemTekst(id: string, tekst: string) {
    wijzig({ items: draft.items.map(i => i.id === id ? { ...i, tekst } : i) })
  }

  function verwijderItem(id: string) {
    wijzig({ items: draft.items.filter(i => i.id !== id) })
  }

  function voegItemToe() {
    const tekst = nieuwTekst.trim()
    if (!tekst) return
    wijzig({ items: [...draft.items, nieuwLijstItem(tekst)] })
    setNieuwTekst('')
    nieuwItemRef.current?.focus()
  }

  // ── Verwijderen (twee-staps bevestiging) ─────────────────────────────────────

  function verwijderKlik() {
    if (!verwijderBevestig) {
      setVerwijderBevestig(true)
      bevestigTimer.current = setTimeout(() => setVerwijderBevestig(false), 3000)
      return
    }
    if (bevestigTimer.current) clearTimeout(bevestigTimer.current)
    onVerwijder(draft.id)
  }

  const inhoudRegels = Math.min(16, Math.max(6, draft.inhoud.split('\n').length + 1))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-28">
            <KopieerKnop notitie={draft} />
          </div>
          <h2 className="text-[15px] font-semibold text-gray-900">
            {isLijst ? 'Lijst' : 'Notitie'}
          </h2>
          <div className="w-28 text-right">
            <button onClick={onSluit} className="text-[#007AFF] text-sm font-semibold">
              Klaar
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Titel */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <input
              type="text"
              value={draft.titel}
              onChange={e => wijzig({ titel: e.target.value })}
              placeholder="Titel"
              className="w-full text-[17px] font-semibold placeholder:text-gray-300 outline-none bg-transparent"
            />
          </div>

          {isLijst ? (
            /* Checklist-items */
            <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-100">
              {draft.items.map(item => (
                <ItemRij
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem(item.id)}
                  onTekst={tekst => wijzigItemTekst(item.id, tekst)}
                  onVerwijder={() => verwijderItem(item.id)}
                  onEnter={() => nieuwItemRef.current?.focus()}
                />
              ))}

              {/* Nieuw item */}
              <div className="flex items-center gap-2 px-3 py-1">
                <Plus size={18} className="text-gray-300 shrink-0 ml-0.5" />
                <input
                  ref={nieuwItemRef}
                  type="text"
                  value={nieuwTekst}
                  onChange={e => setNieuwTekst(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); voegItemToe() } }}
                  onBlur={voegItemToe}
                  placeholder="Nieuw item…"
                  className="flex-1 min-w-0 text-[15px] py-2.5 outline-none bg-transparent placeholder:text-gray-300"
                />
              </div>
            </div>
          ) : (
            /* Inhoud */
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <textarea
                value={draft.inhoud}
                onChange={e => wijzig({ inhoud: e.target.value })}
                placeholder="Notitie…"
                rows={inhoudRegels}
                className="w-full text-[15px] outline-none bg-transparent placeholder:text-gray-300 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Verwijderen — twee-staps bevestiging tegen per-ongeluk-klikken */}
          <button
            onClick={verwijderKlik}
            className={[
              'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-medium transition-colors',
              verwijderBevestig
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-red-50 text-red-500 hover:bg-red-100',
            ].join(' ')}
          >
            <Trash2 size={16} />
            {verwijderBevestig ? 'Zeker weten?' : isLijst ? 'Verwijder lijst' : 'Verwijder notitie'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Eén checklist-regel: checkbox + tekstveld + verwijderknopje.
function ItemRij({ item, onToggle, onTekst, onVerwijder, onEnter }: {
  item: LijstItem
  onToggle: () => void
  onTekst: (tekst: string) => void
  onVerwijder: () => void
  onEnter: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <button
        onClick={onToggle}
        aria-label={item.afgevinkt ? 'Vink uit' : 'Vink af'}
        className="p-2 -m-1 shrink-0 rounded-full transition-colors"
      >
        {item.afgevinkt
          ? <CheckCircle2 size={20} className="text-[#007AFF]" />
          : <Circle size={20} className="text-gray-300 hover:text-gray-400" />}
      </button>
      <input
        type="text"
        value={item.tekst}
        onChange={e => onTekst(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } }}
        className={[
          'flex-1 min-w-0 text-[15px] py-2.5 outline-none bg-transparent',
          item.afgevinkt ? 'text-gray-400 line-through' : 'text-gray-900',
        ].join(' ')}
      />
      <button
        onClick={onVerwijder}
        aria-label="Verwijder item"
        className="p-2 -m-1 shrink-0 text-gray-300 hover:text-red-500 transition-colors rounded-full"
      >
        <X size={16} />
      </button>
    </div>
  )
}
