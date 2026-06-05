'use client'

import type { Notitie, Label } from '@/types'
import NotitieKaart from './NotitieKaart'

interface Props {
  notities: Notitie[]
  labels: Label[]
  onOpen: (notitie: Notitie) => void
  onLabelKlik?: (id: string) => void
}

// Responsive grid van notitiekaarten (1 kolom mobiel → 4 op breed scherm).
export default function NotitieGrid({ notities, labels, onOpen, onLabelKlik }: Props) {
  return (
    <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-min">
      {notities.map(n => (
        <NotitieKaart key={n.id} notitie={n} labels={labels} onOpen={onOpen} onLabelKlik={onLabelKlik} />
      ))}
    </div>
  )
}
