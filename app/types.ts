// Gedeelde types voor de Notes-app.
// Het datamodel spiegelt supabase/schema.sql (snake_case ↔ camelCase via
// de converters in lib/supabaseOpslag.ts, agenda-patroon).

/** Actieve hoofdweergave in de app. */
export type Weergave = 'alle' | 'map' | 'archief'

/** Soort content: gewone notitie of afvinkbare lijst. */
export type NotitieType = 'notitie' | 'lijst'

/** Eén regel in een checklist. Volgorde = arrayvolgorde op de notitie. */
export type LijstItem = {
  id: string
  tekst: string
  afgevinkt: boolean
}

export type Notitie = {
  id: string
  type: NotitieType
  titel: string
  inhoud: string          // gebruikt bij type 'notitie'
  items: LijstItem[]      // gebruikt bij type 'lijst'
  labelIds: string[]
  mapId?: string          // undefined = geen map
  gearchiveerd: boolean
  gearchiveerdOp?: string // ISO timestamp
  aangemaaktOp: string    // ISO timestamp
  gewijzigdOp: string     // ISO timestamp — basis voor automatisch archiveren (fase 8)
}

// Bewust identiek aan agenda's Label zodat LabelBeheer later 1:1 herbruikbaar is.
export type Label = {
  id: string
  naam: string
  kleur: string
  achtergrondKleur?: string
  tekstKleur?: string
}

// "NotitieMap" en niet "Map" — voorkomt botsing met de globale ES Map.
export type NotitieMap = {
  id: string
  naam: string
  kleur?: string
  aangemaaktOp: string    // ISO timestamp
}

/** Sentinel voor het mapfilter "Geen map" (notities zonder map). Botst nooit
 *  met echte map-ids omdat die UUID's zijn. */
export const GEEN_MAP_FILTER = 'geen-map'

export type Instellingen = {
  autoArchiefAan: boolean
  autoArchiefDagen: number
}

export const STANDAARD_INSTELLINGEN: Instellingen = {
  autoArchiefAan: false,
  autoArchiefDagen: 30,   // standaard: 1 maand
}
