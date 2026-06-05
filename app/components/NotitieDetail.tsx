'use client'

import { useState, useEffect, useRef } from 'react'
import { Archive, ArchiveRestore, Check, ChevronDown, ChevronUp, Circle, CheckCircle2, FolderMinus, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Notitie, LijstItem, Label, NotitieMap } from '@/types'
import { metGewijzigdOp, nieuwLijstItem } from '@/lib/helpers'
import { eventKleuren } from '@/lib/kleuren'
import { useEscape } from '@/lib/useEscape'
import KopieerKnop from './KopieerKnop'
import LabelPill from './LabelPill'
import MapIcoon from './MapIcoon'

interface Props {
  notitie: Notitie
  labels: Label[]
  mappen: NotitieMap[]
  onWijzig: (notitie: Notitie) => void
  onArchiveerToggle: (id: string) => void
  onVerwijder: (id: string) => void
  onSluit: () => void
}

// Detailweergave/editor met auto-save (iOS Notes-stijl): elke wijziging wordt
// direct doorgegeven aan NotesApp (optimistisch lokaal + debounced Supabase).
// De draft is bewust onafhankelijk van props ná het openen, zodat een
// realtime-herlaad de open editor nooit overschrijft.
export default function NotitieDetail({ notitie, labels, mappen, onWijzig, onArchiveerToggle, onVerwijder, onSluit }: Props) {
  const [draft, setDraft] = useState<Notitie>(() => ({ ...notitie, items: [...notitie.items] }))
  const [nieuwTekst, setNieuwTekst] = useState('')
  const [verwijderBevestig, setVerwijderBevestig] = useState(false)
  const [labelKiezerOpen, setLabelKiezerOpen] = useState(false)
  const [mapKiezerOpen, setMapKiezerOpen] = useState(false)
  // Bewerk-modus: map, labels en verwijderen zijn verborgen tot je op het
  // potlood tikt — de geopende note focust zo puur op de inhoud.
  const [bewerkModus, setBewerkModus] = useState(false)

  const nieuwItemRef    = useRef<HTMLInputElement>(null)
  const bevestigTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset de draft alleen wanneer een ándere notitie geopend wordt.
  useEffect(() => {
    // Bewuste draft-reset bij wisselen van notitie; de modal blijft gemount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft({ ...notitie, items: [...notitie.items] })
    setNieuwTekst('')
    setVerwijderBevestig(false)
    setLabelKiezerOpen(false)
    setMapKiezerOpen(false)
    setBewerkModus(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notitie.id])

  useEffect(() => () => { if (bevestigTimer.current) clearTimeout(bevestigTimer.current) }, [])

  // Escape sluit de editor (zelfde nette afronding als "Klaar": flush + opruimen).
  useEscape(true, onSluit)

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

  // ── Labels ───────────────────────────────────────────────────────────────────

  // Koppelt of ontkoppelt een label; includes-check voorkomt dubbele koppelingen.
  function toggleLabel(id: string) {
    wijzig({
      labelIds: draft.labelIds.includes(id)
        ? draft.labelIds.filter(l => l !== id)
        : [...draft.labelIds, id],
    })
  }

  // Gekoppelde labels opzoeken; verwijderde/onbekende ids stil overslaan.
  const gekoppeldeLabels = draft.labelIds
    .map(id => labels.find(l => l.id === id))
    .filter((l): l is Label => l !== undefined)

  // Het eerste label in labelIds bepaalt de achtergrondkleur van de kaart;
  // kiezen = dat label vooraan zetten (geen extra opslagveld nodig).
  function kiesKaartKleur(id: string) {
    if (draft.labelIds[0] === id) return
    wijzig({ labelIds: [id, ...draft.labelIds.filter(l => l !== id)] })
  }

  // ── Map ──────────────────────────────────────────────────────────────────────

  // Verplaatst de note naar een map (of haalt hem eruit) via het normale
  // auto-save-pad — alleen mapId wijzigt, de rest van de draft blijft staan.
  function kiesMap(id?: string) {
    wijzig({ mapId: id })
    setMapKiezerOpen(false)
  }

  const huidigeMap = mappen.find(m => m.id === draft.mapId)

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

      <div role="dialog" aria-modal="true" aria-label={isLijst ? 'Lijst' : 'Notitie'} className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-28">
            <KopieerKnop notitie={draft} />
          </div>
          <h2 className="text-[15px] font-semibold text-gray-900">
            {isLijst ? 'Lijst' : 'Notitie'}
          </h2>
          <div className="w-28 flex items-center justify-end gap-2">
            <button
              onClick={() => setBewerkModus(o => !o)}
              aria-label={bewerkModus ? 'Verberg opties' : 'Toon map, labels en verwijderen'}
              aria-pressed={bewerkModus}
              className={[
                'p-2.5 -m-1 rounded-full transition-colors',
                bewerkModus ? 'bg-blue-50 text-[#007AFF]' : 'text-gray-400 hover:text-[#007AFF]',
              ].join(' ')}
            >
              <Pencil size={15} />
            </button>
            <button onClick={onSluit} className="text-[#007AFF] text-sm font-semibold">
              Klaar
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3 modal-safe-bottom">
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

          {/* Map, labels en verwijderen: verborgen tot de bewerk-modus (potlood) */}
          {bewerkModus && (<>

          {/* Map */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Map</span>
              <button
                onClick={() => setMapKiezerOpen(o => !o)}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[#007AFF] hover:text-[#0066D6] transition-colors min-w-0"
              >
                {mapKiezerOpen ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                <span className="truncate max-w-[180px]">{huidigeMap?.naam ?? 'Geen map'}</span>
              </button>
            </div>

            {/* Keuzelijst: Geen map + alle mappen */}
            {mapKiezerOpen && (
              mappen.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <button
                    onClick={() => kiesMap(undefined)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <FolderMinus size={16} className="text-gray-400 shrink-0" />
                    <span className="flex-1 text-[14px] text-gray-900 text-left truncate">Geen map</span>
                    {!draft.mapId && <Check size={16} className="text-[#007AFF] shrink-0" />}
                  </button>
                  {mappen.map(map => (
                    <button
                      key={map.id}
                      onClick={() => kiesMap(map.id)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <MapIcoon map={map} size={22} />
                      <span className="flex-1 text-[14px] text-gray-900 text-left truncate">{map.naam}</span>
                      {draft.mapId === map.id && <Check size={16} className="text-[#007AFF] shrink-0" />}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-gray-400">
                  Nog geen mappen — maak ze aan via <strong>Mappen</strong> in het menu.
                </p>
              )
            )}
          </div>

          {/* Labels */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Labels</span>
              <button
                onClick={() => setLabelKiezerOpen(o => !o)}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[#007AFF] hover:text-[#0066D6] transition-colors"
              >
                {labelKiezerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {labelKiezerOpen ? 'Sluit' : 'Label toevoegen'}
              </button>
            </div>

            {/* Gekoppelde labels */}
            {gekoppeldeLabels.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {gekoppeldeLabels.map(label => (
                  <LabelPill key={label.id} label={label} onVerwijder={() => toggleLabel(label.id)} />
                ))}
              </div>
            ) : (
              !labelKiezerOpen && <p className="text-[13px] text-gray-300">Geen labels</p>
            )}

            {/* Kaartkleur: bij 2+ labels kiezen welk label de kaart kleurt */}
            {gekoppeldeLabels.length >= 2 && (
              <div className="pt-1 space-y-1.5">
                <p className="text-[12px] text-gray-400">Welke kleur krijgt de kaart?</p>
                <div className="flex flex-wrap gap-1.5">
                  {gekoppeldeLabels.map(label => {
                    const actief = draft.labelIds[0] === label.id
                    return (
                      <button
                        key={label.id}
                        onClick={() => kiesKaartKleur(label.id)}
                        aria-pressed={actief}
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[12px] font-medium transition-colors',
                          actief
                            ? 'border-[#007AFF] text-gray-900'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300',
                        ].join(' ')}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: eventKleuren(label).achtergrond,
                            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                          }}
                        />
                        <span className="truncate max-w-[120px]">{label.naam}</span>
                        {actief && <Check size={12} className="text-[#007AFF] shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Keuzelijst: alle labels aan/uit togglen */}
            {labelKiezerOpen && (
              labels.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  {labels.map(label => {
                    const actief = draft.labelIds.includes(label.id)
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: label.kleur }} />
                        <span className="flex-1 text-[14px] text-gray-900 text-left truncate">{label.naam}</span>
                        {actief && <Check size={16} className="text-[#007AFF] shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-gray-400">
                  Nog geen labels — maak ze aan via <strong>Labels</strong> in het menu.
                </p>
              )
            )}
          </div>

          {/* Archiveren / terugzetten — omkeerbaar, dus geen bevestiging */}
          <button
            onClick={() => onArchiveerToggle(draft.id)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {draft.gearchiveerd ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            {draft.gearchiveerd ? 'Zet terug' : isLijst ? 'Archiveer lijst' : 'Archiveer notitie'}
          </button>

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

          </>)}
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
