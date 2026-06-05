// Kopieerfunctie: zet een notitie om naar platte tekst (zonder opmaak of
// metadata) en kopieert die naar het klembord, met fallback voor browsers
// zonder (werkende) Clipboard API.
import type { Notitie } from '@/types'

/**
 * Plain-text weergave van een notitie:
 * - Notitie:  titel + lege regel + inhoud (lege delen worden weggelaten).
 * - Lijst:    titel + lege regel + per item één regel "[x] tekst" / "[ ] tekst".
 * Geen labels, mapnaam of andere metadata.
 */
export function notitieAlsTekst(n: Notitie): string {
  const titel = n.titel.trim()

  if (n.type === 'lijst') {
    const regels = n.items
      .map(item => `${item.afgevinkt ? '[x]' : '[ ]'} ${item.tekst.trim()}`)
    const body = regels.join('\n')
    return [titel, body].filter(Boolean).join('\n\n')
  }

  const inhoud = n.inhoud.trim()
  return [titel, inhoud].filter(Boolean).join('\n\n')
}

/**
 * Kopieert tekst naar het klembord. Geeft true terug bij succes.
 * Moet synchroon vanuit een user-gesture (onClick) aangeroepen worden,
 * anders weigert iOS Safari de schrijfactie.
 */
export async function kopieerNaarKlembord(tekst: string): Promise<boolean> {
  // Voorkeur: moderne async Clipboard API (vereist secure context).
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(tekst)
      return true
    }
  } catch {
    // Val door naar de execCommand-fallback.
  }

  // Fallback: verborgen textarea + execCommand('copy').
  try {
    const ta = document.createElement('textarea')
    ta.value = tekst
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, tekst.length)   // iOS Safari heeft een expliciete range nodig
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
