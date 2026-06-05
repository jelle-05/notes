// Kleine factories en helpers voor het datamodel; houden de UI-fases dun.
import type { Notitie, NotitieType, LijstItem } from '@/types'

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
