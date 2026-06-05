'use client'

import { Folder } from 'lucide-react'
import type { NotitieMap } from '@/types'
import { labelAchtergrond } from '@/lib/kleuren'

interface Props {
  map?: Partial<NotitieMap>
  actief?: boolean   // alleen relevant zonder kleur: blauw i.p.v. grijs icoon
  size?: number      // diameter van de ronde badge
}

// Mapicoon: met een kleur wordt het een ronde badge (border-radius 100px) met
// het mapje in de kleur op een lichtere tint van diezelfde kleur; zonder kleur
// een neutraal (grijs of actief-blauw) mapje.
export default function MapIcoon({ map, actief = false, size = 24 }: Props) {
  const kleur = map?.kleur

  if (!kleur) {
    return <Folder size={18} className={`shrink-0 ${actief ? 'text-[#007AFF]' : 'text-gray-400'}`} />
  }

  // De badge is breder dan de 18px-iconen ernaast; negatieve marge laat hem
  // aan beide kanten evenveel uitsteken zodat het icoon-center én de tekst
  // erna gewoon uitlijnen (bij pl-3-rijen begint de badge zo op 9px).
  const overschot = (size - 18) / 2

  return (
    <span
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: 100,
        backgroundColor: labelAchtergrond(kleur, 0.15),
        marginLeft: -overschot,
        marginRight: -overschot,
      }}
    >
      <Folder size={Math.round(size * 0.58)} style={{ color: kleur }} />
    </span>
  )
}
