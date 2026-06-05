// localStorage-cache (offline-first, agenda-patroon): de app toont bij het
// opstarten direct deze gecachte data en synct daarna stil met Supabase.
import type { Notitie, Label, NotitieMap, Instellingen } from '@/types'
import { STANDAARD_INSTELLINGEN } from '@/types'

const SLEUTEL_NOTITIES     = 'notes_notities'
const SLEUTEL_LABELS       = 'notes_labels'
const SLEUTEL_MAPPEN       = 'notes_mappen'
const SLEUTEL_INSTELLINGEN = 'notes_instellingen'

// Corrupte cache mag de app nooit breken: bij parse-fouten lege lijst teruggeven.
function laadLijst<T>(sleutel: string): T[] {
  const data = localStorage.getItem(sleutel)
  if (!data) return []
  try {
    return JSON.parse(data) as T[]
  } catch {
    return []
  }
}

// ── Notities ──────────────────────────────────────────────────────────────────

export function laadNotities(): Notitie[] {
  return laadLijst<Notitie>(SLEUTEL_NOTITIES)
}

export function slaNotitieOp(notitie: Notitie, alle: Notitie[]): Notitie[] {
  const idx = alle.findIndex(n => n.id === notitie.id)
  const nieuw = idx >= 0 ? alle.map((n, i) => (i === idx ? notitie : n)) : [...alle, notitie]
  localStorage.setItem(SLEUTEL_NOTITIES, JSON.stringify(nieuw))
  return nieuw
}

export function verwijderNotitie(id: string, alle: Notitie[]): Notitie[] {
  const nieuw = alle.filter(n => n.id !== id)
  localStorage.setItem(SLEUTEL_NOTITIES, JSON.stringify(nieuw))
  return nieuw
}

export function slaAlleNotitiesOp(alle: Notitie[]): void {
  localStorage.setItem(SLEUTEL_NOTITIES, JSON.stringify(alle))
}

// ── Labels ────────────────────────────────────────────────────────────────────

export function laadLabels(): Label[] {
  return laadLijst<Label>(SLEUTEL_LABELS)
}

export function slaLabelOp(label: Label, alle: Label[]): Label[] {
  const idx = alle.findIndex(l => l.id === label.id)
  const nieuw = idx >= 0 ? alle.map((l, i) => (i === idx ? label : l)) : [...alle, label]
  localStorage.setItem(SLEUTEL_LABELS, JSON.stringify(nieuw))
  return nieuw
}

export function verwijderLabel(id: string, alle: Label[]): Label[] {
  const nieuw = alle.filter(l => l.id !== id)
  localStorage.setItem(SLEUTEL_LABELS, JSON.stringify(nieuw))
  return nieuw
}

export function slaAlleLabelsOp(alle: Label[]): void {
  localStorage.setItem(SLEUTEL_LABELS, JSON.stringify(alle))
}

// ── Mappen ────────────────────────────────────────────────────────────────────

export function laadMappen(): NotitieMap[] {
  return laadLijst<NotitieMap>(SLEUTEL_MAPPEN)
}

export function slaMapOp(map: NotitieMap, alle: NotitieMap[]): NotitieMap[] {
  const idx = alle.findIndex(m => m.id === map.id)
  const nieuw = idx >= 0 ? alle.map((m, i) => (i === idx ? map : m)) : [...alle, map]
  localStorage.setItem(SLEUTEL_MAPPEN, JSON.stringify(nieuw))
  return nieuw
}

export function verwijderMap(id: string, alle: NotitieMap[]): NotitieMap[] {
  const nieuw = alle.filter(m => m.id !== id)
  localStorage.setItem(SLEUTEL_MAPPEN, JSON.stringify(nieuw))
  return nieuw
}

export function slaAlleMappenOp(alle: NotitieMap[]): void {
  localStorage.setItem(SLEUTEL_MAPPEN, JSON.stringify(alle))
}

// ── Instellingen ──────────────────────────────────────────────────────────────

export function laadInstellingen(): Instellingen {
  const data = localStorage.getItem(SLEUTEL_INSTELLINGEN)
  if (!data) return { ...STANDAARD_INSTELLINGEN }
  try {
    // Merge met defaults zodat ontbrekende keys hun standaardwaarde houden.
    return { ...STANDAARD_INSTELLINGEN, ...(JSON.parse(data) as Partial<Instellingen>) }
  } catch {
    return { ...STANDAARD_INSTELLINGEN }
  }
}

export function slaInstellingenOp(instellingen: Instellingen): void {
  localStorage.setItem(SLEUTEL_INSTELLINGEN, JSON.stringify(instellingen))
}
