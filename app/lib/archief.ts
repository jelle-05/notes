// Automatisch archiveren (Fase 8): pure selectielogica, los van React/Supabase
// zodat het gedrag geïsoleerd en voorspelbaar blijft. De daadwerkelijke
// statusovergang loopt via NotesApp (zelfde pad als handmatig archiveren).
import type { Notitie, Instellingen } from '@/types'

const MS_PER_DAG = 86_400_000

/** Grenzen voor de instelbare archiefperiode (in dagen). */
export const MIN_ARCHIEF_DAGEN = 1
export const MAX_ARCHIEF_DAGEN = 3650

/** Clamp een (mogelijk ongeldige) dagenwaarde naar het toegestane bereik. */
export function clampArchiefDagen(dagen: number): number {
  if (!Number.isFinite(dagen)) return 30
  return Math.min(MAX_ARCHIEF_DAGEN, Math.max(MIN_ARCHIEF_DAGEN, Math.round(dagen)))
}

/**
 * Actieve notities waarvan de laatste wijziging ouder is dan de ingestelde
 * periode. Leeftijd op basis van gewijzigdOp (inactiviteit is de maat —
 * afvinken/bewerken houdt een note "levend"), met aangemaaktOp als fallback.
 * Geeft [] als auto-archiveren uit staat of de instelling ongeldig is;
 * onparseerbare datums worden overgeslagen (nooit per ongeluk archiveren).
 */
export function vindAutoArchiefKandidaten(
  notities: Notitie[],
  instellingen: Instellingen,
  nu: number = Date.now(),
): Notitie[] {
  if (!instellingen.autoArchiefAan) return []
  const dagen = instellingen.autoArchiefDagen
  if (!Number.isFinite(dagen) || dagen < MIN_ARCHIEF_DAGEN) return []

  const drempel = nu - dagen * MS_PER_DAG
  return notities.filter(n => {
    if (n.gearchiveerd) return false
    const basis = Date.parse(n.gewijzigdOp || n.aangemaaktOp)
    return Number.isFinite(basis) && basis < drempel
  })
}
