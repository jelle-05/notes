'use client'

import { useState, useEffect } from 'react'
import { Archive, StickyNote } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Weergave, Notitie, Label, NotitieMap, Instellingen } from '@/types'
import { STANDAARD_INSTELLINGEN } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  laadNotities, slaAlleNotitiesOp,
  laadLabels, slaAlleLabelsOp,
  laadMappen, slaAlleMappenOp,
  laadInstellingen, slaInstellingenOp,
} from '@/lib/opslag'
import {
  laadNotitiesVanSupabase, laadLabelsVanSupabase, laadMappenVanSupabase,
  laadInstellingenVanSupabase, uploadNaarSupabase,
} from '@/lib/supabaseOpslag'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomBar from './BottomBar'
import LoginPagina from './LoginPagina'
import ProfielMenu from './ProfielMenu'
import PlaceholderModal from './PlaceholderModal'

// Titels per weergave voor de TopBar.
const WEERGAVE_TITELS: Record<Weergave, string> = {
  alle:    'Notities',
  map:     'Mappen',
  archief: 'Archief',
}

// Placeholder-modals voor functionaliteit uit latere fases (zie fases.md).
type PlaceholderSoort = 'nieuw' | 'labels' | 'mappen' | 'instellingen' | null

const PLACEHOLDER_TITELS: Record<Exclude<PlaceholderSoort, null>, string> = {
  nieuw:        'Nieuwe notitie',
  labels:       'Labels',
  mappen:       'Mappen',
  instellingen: 'Instellingen',
}

export default function NotesApp() {
  // Auth
  const [gebruiker, setGebruiker] = useState<User | null>(null)
  const [klaar, setKlaar]         = useState(false)

  // Data (offline-first: localStorage direct, daarna stille Supabase-sync)
  const [notities, setNotities]         = useState<Notitie[]>([])
  const [labels, setLabels]             = useState<Label[]>([])
  const [mappen, setMappen]             = useState<NotitieMap[]>([])
  const [instellingen, setInstellingen] = useState<Instellingen>(STANDAARD_INSTELLINGEN)

  // Navigatie & modals
  const [weergave, setWeergave]               = useState<Weergave>('alle')
  const [profielMenuOpen, setProfielMenuOpen] = useState(false)
  const [placeholder, setPlaceholder]         = useState<PlaceholderSoort>(null)

  // ── Sync-functies (agenda-patroon) ───────────────────────────────────────────

  // Stille achtergrond-sync: update UI zonder spinner. Fail-open: zolang de
  // SQL-migratie (supabase/schema.sql) nog niet gedraaid is of het netwerk
  // ontbreekt, blijft de gecachte data gewoon zichtbaar.
  async function achtergrondSync() {
    try {
      const [supNotities, supLabels, supMappen] = await Promise.all([
        laadNotitiesVanSupabase(),
        laadLabelsVanSupabase(),
        laadMappenVanSupabase(),
      ])
      if (supNotities.length > 0 || supLabels.length > 0 || supMappen.length > 0) {
        setNotities(supNotities)
        setLabels(supLabels)
        setMappen(supMappen)
        slaAlleNotitiesOp(supNotities)
        slaAlleLabelsOp(supLabels)
        slaAlleMappenOp(supMappen)
      }
    } catch {
      // Tabel bestaat nog niet of netwerk niet beschikbaar: cache blijft zichtbaar
    }
    try {
      const supInstellingen = await laadInstellingenVanSupabase()
      if (supInstellingen) {
        setInstellingen(supInstellingen)
        slaInstellingenOp(supInstellingen)
      }
    } catch {
      // Tabel bestaat nog niet of netwerk niet beschikbaar
    }
  }

  // Herlaad alle data vanuit Supabase en update state + cache (realtime-callback).
  async function herlaadData() {
    try {
      const [supNotities, supLabels, supMappen] = await Promise.all([
        laadNotitiesVanSupabase(),
        laadLabelsVanSupabase(),
        laadMappenVanSupabase(),
      ])
      setNotities(supNotities)
      setLabels(supLabels)
      setMappen(supMappen)
      slaAlleNotitiesOp(supNotities)
      slaAlleLabelsOp(supLabels)
      slaAlleMappenOp(supMappen)
    } catch {
      // Netwerk niet beschikbaar
    }
  }

  // Volledige initialisatie voor eerste login (upload lokale data als Supabase leeg is).
  async function initialiseerData(userId: string) {
    try {
      const [supNotities, supLabels, supMappen] = await Promise.all([
        laadNotitiesVanSupabase(),
        laadLabelsVanSupabase(),
        laadMappenVanSupabase(),
      ])

      if (supNotities.length === 0 && supLabels.length === 0 && supMappen.length === 0) {
        const lokaleNotities = laadNotities()
        const lokaleLabels   = laadLabels()
        const lokaleMappen   = laadMappen()
        await uploadNaarSupabase(lokaleNotities, lokaleLabels, lokaleMappen, userId)
        setNotities(lokaleNotities)
        setLabels(lokaleLabels)
        setMappen(lokaleMappen)
      } else {
        setNotities(supNotities)
        setLabels(supLabels)
        setMappen(supMappen)
        slaAlleNotitiesOp(supNotities)
        slaAlleLabelsOp(supLabels)
        slaAlleMappenOp(supMappen)
      }
    } catch (err) {
      console.error('Supabase laden mislukt, gebruik lokale data:', err)
      setNotities(laadNotities())
      setLabels(laadLabels())
      setMappen(laadMappen())
    }
    try {
      const supInstellingen = await laadInstellingenVanSupabase()
      setInstellingen(supInstellingen ?? laadInstellingen())
      if (supInstellingen) slaInstellingenOp(supInstellingen)
    } catch {
      setInstellingen(laadInstellingen())
    }
  }

  async function uitloggen() {
    await supabase.auth.signOut()
  }

  // ── Auth & data init (agenda-patroon) ────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      setGebruiker(user)

      if (user) {
        // Toon gecachte localStorage-data direct — geen wachten op netwerk
        setNotities(laadNotities())
        setLabels(laadLabels())
        setMappen(laadMappen())
        setInstellingen(laadInstellingen())
        setKlaar(true)
        // Sync Supabase stil op de achtergrond
        achtergrondSync()
      } else {
        setKlaar(true)   // Toon loginpagina
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null
      setGebruiker(user)

      if (event === 'SIGNED_IN' && user) {
        // Verse login: eenmalig volledige initialisatie
        setKlaar(false)
        initialiseerData(user.id).finally(() => setKlaar(true))
      } else if (event === 'SIGNED_OUT') {
        setNotities([])
        setLabels([])
        setMappen([])
        setInstellingen(STANDAARD_INSTELLINGEN)
        // klaar blijft true → loginpagina zichtbaar
      }
      // TOKEN_REFRESHED / USER_UPDATED: geen actie — data is al geladen
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Android back-gesture blokkeren ───────────────────────────────────────────
  // Single-page app op '/': de systeem-back-swipe zou de app verlaten en een
  // grijs/leeg scherm tonen. Houd de history-stack gevuld zodat back binnen de
  // app blijft (modals sluit je via hun eigen knop).
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const onPop = () => window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // ── Real-time sync: luister naar wijzigingen in de database ──────────────────
  useEffect(() => {
    if (!gebruiker) return

    const kanaal = supabase
      .channel(`notes-${gebruiker.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, herlaadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes_labels' }, herlaadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes_mappen' }, herlaadData)
      .subscribe()

    return () => { supabase.removeChannel(kanaal) }
  }, [gebruiker])

  // Placeholder-teksten; tonen alvast de gesyncte aantallen uit Fase 2.
  function placeholderTekst(soort: Exclude<PlaceholderSoort, null>): string {
    switch (soort) {
      case 'nieuw':
        return 'Notities en lijstjes aanmaken komt in Fase 3.'
      case 'labels':
        return labels.length > 0
          ? `${labels.length} label${labels.length === 1 ? '' : 's'} gesynchroniseerd — beheren komt in Fase 4.`
          : 'Labels beheren komt in Fase 4.'
      case 'mappen':
        return mappen.length > 0
          ? `${mappen.length} map${mappen.length === 1 ? '' : 'pen'} gesynchroniseerd — beheren komt in Fase 6.`
          : 'Mappen beheren komt in Fase 6.'
      case 'instellingen':
        return `Instellingen komen in Fase 8. Automatisch archiveren staat nu ${instellingen.autoArchiefAan ? `aan (na ${instellingen.autoArchiefDagen} dagen)` : 'uit'}.`
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!klaar) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-[14px] text-gray-400">Laden…</p>
      </div>
    )
  }

  if (!gebruiker) {
    return <LoginPagina onIngelogd={() => { /* onAuthStateChange zet de gebruiker */ }} />
  }

  const actieveNotities     = notities.filter(n => !n.gearchiveerd)
  const gearchiveerdeAantal = notities.length - actieveNotities.length

  return (
    <div className="h-full flex bg-gray-50">
      {/* Desktop-sidebar (verborgen op mobiel) */}
      <Sidebar
        weergave={weergave}
        onWeergaveChange={setWeergave}
        onLabels={() => setPlaceholder('labels')}
        onMappen={() => setPlaceholder('mappen')}
        onInstellingen={() => setPlaceholder('instellingen')}
      />

      {/* Hoofdkolom */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          titel={WEERGAVE_TITELS[weergave]}
          onNieuw={() => setPlaceholder('nieuw')}
          onProfielMenu={() => setProfielMenuOpen(true)}
          gebruikerEmail={gebruiker.email}
        />

        {/* Content: Fase 3 vervangt de empty states door het notitie-grid */}
        <main className="flex-1 overflow-y-auto">
          {weergave === 'archief' ? (
            <EmptyState
              icon={<Archive size={40} className="text-gray-300" />}
              titel="Archief is leeg"
              tekst={gearchiveerdeAantal > 0
                ? `${gearchiveerdeAantal} gearchiveerde notitie${gearchiveerdeAantal === 1 ? '' : 's'} gesynchroniseerd — weergave komt in Fase 3.`
                : 'Gearchiveerde notities en lijstjes verschijnen hier.'}
            />
          ) : (
            <EmptyState
              icon={<StickyNote size={40} className="text-gray-300" />}
              titel="Nog geen notities"
              tekst={actieveNotities.length > 0
                ? `${actieveNotities.length} notitie${actieveNotities.length === 1 ? '' : 's'} gesynchroniseerd — weergave komt in Fase 3.`
                : 'Vanaf Fase 3 kun je hier notities en lijstjes aanmaken.'}
            />
          )}
        </main>

        {/* Mobiele navigatie (verborgen op desktop) */}
        <BottomBar
          weergave={weergave}
          onWeergaveChange={setWeergave}
          onMappen={() => setPlaceholder('mappen')}
        />
      </div>

      {/* Modals */}
      <ProfielMenu
        open={profielMenuOpen}
        email={gebruiker.email ?? ''}
        onInstellingen={() => setPlaceholder('instellingen')}
        onUitloggen={uitloggen}
        onSluit={() => setProfielMenuOpen(false)}
      />
      {placeholder && (
        <PlaceholderModal
          open
          titel={PLACEHOLDER_TITELS[placeholder]}
          tekst={placeholderTekst(placeholder)}
          onSluit={() => setPlaceholder(null)}
        />
      )}
    </div>
  )
}

// Rustige iOS-stijl empty state, gecentreerd in de contentkolom.
function EmptyState({ icon, titel, tekst }: { icon: React.ReactNode; titel: string; tekst: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
      {icon}
      <h2 className="text-[17px] font-semibold text-gray-900">{titel}</h2>
      <p className="text-[14px] text-gray-400 max-w-[280px]">{tekst}</p>
    </div>
  )
}
