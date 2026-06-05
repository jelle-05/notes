// Kleine factories en helpers voor het datamodel; houden de UI-fases dun.
import type { Notitie, NotitieType, LijstItem, NotitieMap } from '@/types'

/** Huidige tijd als ISO-string (gebruikt voor aangemaaktOp/gewijzigdOp). */
export function nuIso(): string {
  return new Date().toISOString()
}

/** Nieuwe lege notitie of lijst met correcte defaults en timestamps. */
export function nieuweNotitie(type: NotitieType): Notitie {
  const nu = nuIso()
  return {
    id: crypto.randomUUID(),
    type,
    titel: '',
    inhoud: '',
    items: [],
    labelIds: [],
    mapId: undefined,
    gearchiveerd: false,
    gearchiveerdOp: undefined,
    aangemaaktOp: nu,
    gewijzigdOp: nu,
  }
}

/** Nieuwe map met gegeven (al getrimde) naam. */
export function nieuweMap(naam: string): NotitieMap {
  return {
    id: crypto.randomUUID(),
    naam,
    aangemaaktOp: nuIso(),
  }
}

/** Nieuw (onafgevinkt) checklist-item. */
export function nieuwLijstItem(tekst = ''): LijstItem {
  return {
    id: crypto.randomUUID(),
    tekst,
    afgevinkt: false,
  }
}

/** Kopie van de notitie met bijgewerkte gewijzigdOp — gebruik bij elke save. */
export function metGewijzigdOp(notitie: Notitie): Notitie {
  return { ...notitie, gewijzigdOp: nuIso() }
}

/** Is de notitie volledig leeg? (Wordt bij sluiten dan stil verwijderd.) */
export function isLeeg(n: Notitie): boolean {
  return !n.titel.trim()
    && !n.inhoud.trim()
    && n.items.every(item => !item.tekst.trim())
}

const NL_MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

/** Korte datumweergave voor kaarten: "Vandaag", "Gisteren" of "5 jun". */
export function formatDatumKort(iso: string): string {
  const d = new Date(iso)
  const nu = new Date()
  const vandaag  = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())
  const die      = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dagen = Math.round((vandaag.getTime() - die.getTime()) / 86_400_000)
  if (dagen === 0) return 'Vandaag'
  if (dagen === 1) return 'Gisteren'
  const jaar = d.getFullYear() === nu.getFullYear() ? '' : ` ${d.getFullYear()}`
  return `${d.getDate()} ${NL_MAANDEN_KORT[d.getMonth()]}${jaar}`
}
