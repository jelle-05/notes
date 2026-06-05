// Supabase CRUD-laag (agenda-patroon): converters tussen camelCase (app) en
// snake_case (database), hele-rij-upserts, en een bulk-upload voor de eerste
// login. Tabellen: zie supabase/schema.sql.
import { supabase } from './supabase'
import type { Notitie, LijstItem, Label, NotitieMap, Instellingen } from '@/types'
import { STANDAARD_INSTELLINGEN } from '@/types'

// ── Converters ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rijNaarNotitie(rij: any): Notitie {
  return {
    id:       rij.id,
    type:     rij.type === 'lijst' ? 'lijst' : 'notitie',
    titel:    rij.titel  ?? '',
    inhoud:   rij.inhoud ?? '',
    items:    Array.isArray(rij.items) ? (rij.items as LijstItem[]) : [],
    labelIds: rij.label_ids ?? [],
    mapId:          rij.map_id          ?? undefined,
    gearchiveerd:   rij.gearchiveerd    ?? false,
    gearchiveerdOp: rij.gearchiveerd_op ?? undefined,
    aangemaaktOp:   rij.aangemaakt_op,
    gewijzigdOp:    rij.gewijzigd_op,
  }
}

function notitieNaarRij(n: Notitie, userId: string) {
  return {
    id:        n.id,
    user_id:   userId,
    type:      n.type,
    titel:     n.titel,
    inhoud:    n.inhoud,
    items:     n.items,
    label_ids: n.labelIds,
    map_id:          n.mapId          ?? null,
    gearchiveerd:    n.gearchiveerd,
    gearchiveerd_op: n.gearchiveerdOp ?? null,
    aangemaakt_op:   n.aangemaaktOp,
    gewijzigd_op:    n.gewijzigdOp,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rijNaarLabel(rij: any): Label {
  return {
    id:    rij.id,
    naam:  rij.naam,
    kleur: rij.kleur,
    achtergrondKleur: rij.achtergrond_kleur ?? undefined,
    tekstKleur:       rij.tekst_kleur       ?? undefined,
  }
}

function labelNaarRij(l: Label, userId: string) {
  return {
    id: l.id, user_id: userId, naam: l.naam, kleur: l.kleur,
    achtergrond_kleur: l.achtergrondKleur ?? null,
    tekst_kleur:       l.tekstKleur       ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rijNaarMap(rij: any): NotitieMap {
  return {
    id:           rij.id,
    naam:         rij.naam,
    kleur:        rij.kleur ?? undefined,
    aangemaaktOp: rij.aangemaakt_op,
  }
}

function mapNaarRij(m: NotitieMap, userId: string) {
  return {
    id:            m.id,
    user_id:       userId,
    naam:          m.naam,
    kleur:         m.kleur ?? null,
    aangemaakt_op: m.aangemaaktOp,
  }
}

// ── Notities ─────────────────────────────────────────────────────────────────

export async function laadNotitiesVanSupabase(): Promise<Notitie[]> {
  const { data, error } = await supabase.from('notes').select('*')
  if (error) throw error
  return (data ?? []).map(rijNaarNotitie)
}

export async function slaNotitieOpInSupabase(n: Notitie, userId: string): Promise<void> {
  const { error } = await supabase.from('notes').upsert(notitieNaarRij(n, userId))
  if (error) throw error
}

export async function slaVeelNotitiesOpInSupabase(notities: Notitie[], userId: string): Promise<void> {
  if (!notities.length) return
  const { error } = await supabase.from('notes').upsert(notities.map(n => notitieNaarRij(n, userId)))
  if (error) throw error
}

export async function verwijderNotitieUitSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

// ── Labels ───────────────────────────────────────────────────────────────────

export async function laadLabelsVanSupabase(): Promise<Label[]> {
  const { data, error } = await supabase.from('notes_labels').select('*')
  if (error) throw error
  return (data ?? []).map(rijNaarLabel)
}

export async function slaLabelOpInSupabase(l: Label, userId: string): Promise<void> {
  const { error } = await supabase.from('notes_labels').upsert(labelNaarRij(l, userId))
  if (error) throw error
}

export async function verwijderLabelUitSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('notes_labels').delete().eq('id', id)
  if (error) throw error
}

// ── Mappen ───────────────────────────────────────────────────────────────────

export async function laadMappenVanSupabase(): Promise<NotitieMap[]> {
  const { data, error } = await supabase.from('notes_mappen').select('*')
  if (error) throw error
  return (data ?? []).map(rijNaarMap)
}

export async function slaMapOpInSupabase(m: NotitieMap, userId: string): Promise<void> {
  const { error } = await supabase.from('notes_mappen').upsert(mapNaarRij(m, userId))
  if (error) throw error
}

export async function verwijderMapUitSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('notes_mappen').delete().eq('id', id)
  if (error) throw error
}

// ── Instellingen ─────────────────────────────────────────────────────────────

// Geeft null terug als er nog geen rij bestaat voor deze gebruiker.
export async function laadInstellingenVanSupabase(): Promise<Instellingen | null> {
  const { data, error } = await supabase.from('notes_instellingen').select('*').maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    autoArchiefAan:   data.auto_archief_aan   ?? STANDAARD_INSTELLINGEN.autoArchiefAan,
    autoArchiefDagen: data.auto_archief_dagen ?? STANDAARD_INSTELLINGEN.autoArchiefDagen,
  }
}

export async function slaInstellingenOpInSupabase(i: Instellingen, userId: string): Promise<void> {
  const { error } = await supabase.from('notes_instellingen').upsert({
    user_id:            userId,
    auto_archief_aan:   i.autoArchiefAan,
    auto_archief_dagen: i.autoArchiefDagen,
    gewijzigd_op:       new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw error
}

// ── Bulk upload (eerste login) ───────────────────────────────────────────────

export async function uploadNaarSupabase(
  notities: Notitie[],
  labels: Label[],
  mappen: NotitieMap[],
  userId: string
): Promise<void> {
  if (labels.length > 0) {
    const { error } = await supabase.from('notes_labels').upsert(labels.map(l => labelNaarRij(l, userId)))
    if (error) throw error
  }
  if (mappen.length > 0) {
    const { error } = await supabase.from('notes_mappen').upsert(mappen.map(m => mapNaarRij(m, userId)))
    if (error) throw error
  }
  if (notities.length > 0) {
    await slaVeelNotitiesOpInSupabase(notities, userId)
  }
}
