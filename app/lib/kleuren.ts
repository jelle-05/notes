// Kleurhelpers — 1:1 overgenomen uit de agenda-app zodat LabelBeheer en de
// pill-weergave identiek werken.
import type { Label } from '@/types'

export function labelAchtergrond(kleur: string, opacity = 0.15): string {
  const r = parseInt(kleur.slice(1, 3), 16)
  const g = parseInt(kleur.slice(3, 5), 16)
  const b = parseInt(kleur.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// Bepaalt de drie kleuren voor het renderen van een label-pill.
// - accent: basiskleur. Altijd `label.kleur` of standaard-grijs.
// - achtergrond: eigen `achtergrondKleur` van het label, anders een lichte tint van accent.
// - tekst: eigen `tekstKleur` van het label, anders de accentkleur.
export function eventKleuren(label?: Label, tintOpacity = 0.18): {
  accent: string
  achtergrond: string
  tekst: string
} {
  const accent = label?.kleur ?? '#8E8E93'
  const achtergrond = label?.achtergrondKleur ?? labelAchtergrond(accent, tintOpacity)
  const tekst = label?.tekstKleur ?? accent
  return { accent, achtergrond, tekst }
}

// ── Transparantie-helpers (#RRGGBB ↔ #RRGGBBAA) ───────────────────────────────
// De alpha wordt in de kleur-string zelf opgeslagen als 8-cijferig hex, zodat er
// geen extra opslagveld nodig is en de waarde direct als CSS-kleur werkt.

// Geeft het #RRGGBB-deel (zonder alpha), voor de native color-picker.
export function hex6Van(hex?: string): string {
  return (hex ?? '#000000').slice(0, 7)
}

// Geeft de alpha als 0..1 (1 als er geen alpha in de hex zit).
export function alphaVan(hex?: string): number {
  if (!hex || hex.length < 9) return 1
  return parseInt(hex.slice(7, 9), 16) / 255
}

// Combineert een #RRGGBB met een alpha (0..1) tot #RRGGBB of #RRGGBBAA.
export function metAlpha(hex6: string, alpha: number): string {
  const basis = hex6.slice(0, 7)
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
  return a >= 255 ? basis : basis + a.toString(16).padStart(2, '0')
}

// Relatieve luminantie van een #rrggbb-kleur (WCAG).
function luminantie(hex: string): number {
  const c = [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

// WCAG-contrastverhouding tussen twee #rrggbb-kleuren (1 = geen contrast, 21 = max).
export function contrastRatio(hex1: string, hex2: string): number {
  try {
    const l1 = luminantie(hex1)
    const l2 = luminantie(hex2)
    const licht = Math.max(l1, l2)
    const donker = Math.min(l1, l2)
    return (licht + 0.05) / (donker + 0.05)
  } catch {
    return 21
  }
}
