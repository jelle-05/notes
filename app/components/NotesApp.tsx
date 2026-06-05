'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Archive, StickyNote } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Weergave, Notitie, NotitieType, Label, NotitieMap, Instellingen } from '@/types'
import { STANDAARD_INSTELLINGEN } from '@/types'
import { supabase } from '@/lib/supabase'
import { nieuweNotitie, isLeeg } from '@/lib/helpers'
import {
  laadNotities, slaNotitieOp, verwijderNotitie, slaAlleNotitiesOp,
  laadLabels, slaLabelOp, verwijderLabel, slaAlleLabelsOp,
  laadMappen, slaAlleMappenOp,
  laadInstellingen, slaInstellingenOp,
} from '@/lib/opslag'
import {
  laadNotitiesVanSupabase, slaNotitieOpInSupabase, slaVeelNotitiesOpInSupabase, verwijderNotitieUitSupabase,
  laadLabelsVanSupabase, slaLabelOpInSupabase, verwijderLabelUitSupabase,
  laadMappenVanSupabase,
  laadInstellingenVanSupabase, uploadNaarSupabase,
} from '@/lib/supabaseOpslag'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomBar from './BottomBar'
import LoginPagina from './LoginPagina'
import ProfielMenu from './ProfielMenu'
import PlaceholderModal from './PlaceholderModal'
import NotitieGrid from './NotitieGrid'
import NotitieDetail from './NotitieDetail'
import NieuwKeuze from './NieuwKeuze'
import LabelBeheer from './LabelBeheer'

// Titels per weergave voor de TopBar.
const WEERGAVE_TITELS: Record<Weergave, string> = {
  alle:    'Notities',
  map:     'Mappen',
  archief: 'Archief',
}

// Placeholder-modals voor functionaliteit uit latere fases (zie fases.md).
type PlaceholderSoort = 'mappen' | 'instellingen' | null

const PLACEHOLDER_TITELS: Record<Exclude<PlaceholderSoort, null>, string> = {
  mappen:       'Mappen',
  instellingen: 'Instellingen',
}

// Debounce-interval voor remote upserts tijdens het typen.
const SYNC_DEBOUNCE_MS = 600

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
  const [nieuwKeuzeOpen, setNieuwKeuzeOpen]   = useState(false)
  const [detailNotitie, setDetailNotitie]     = useState<Notitie | null>(null)
  const [labelBeheerOpen, setLabelBeheerOpen] = useState(false)

  // Debounced remote sync: per notitie één timer; de laatste versie wint.
  const syncTimers  = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pendingSync = useRef(new Map<string, Notitie>())

  // ── Sync-functies (agenda-patroon) ───────────────────────────────────────────

  // Stille achtergrond-sync: update UI zonder spinner. Fail-open: bij netwerk-
  // of tabelproblemen blijft de gecachte data gewoon zichtbaar.
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

  // ── Notitie CRUD (optimistisch lokaal + debounced remote) ────────────────────

  // Plan een remote upsert; opeenvolgende wijzigingen binnen het debounce-venster
  // worden samengevoegd (de laatste versie wint).
  function planRemoteSync(n: Notitie) {
    pendingSync.current.set(n.id, n)
    const userId = gebruiker?.id
    if (!userId) return

    const bestaande = syncTimers.current.get(n.id)
    if (bestaande) clearTimeout(bestaande)

    syncTimers.current.set(n.id, setTimeout(() => {
      syncTimers.current.delete(n.id)
      const laatste = pendingSync.current.get(n.id)
      pendingSync.current.delete(n.id)
      if (laatste) {
        slaNotitieOpInSupabase(laatste, userId)
          .catch(err => console.error('Supabase notitie sync mislukt:', err))
      }
    }, SYNC_DEBOUNCE_MS))
  }

  // Stuur een eventueel wachtende wijziging direct naar Supabase (bij sluiten).
  function flushRemoteSync(id: string) {
    const timer = syncTimers.current.get(id)
    if (timer) clearTimeout(timer)
    syncTimers.current.delete(id)

    const laatste = pendingSync.current.get(id)
    pendingSync.current.delete(id)
    const userId = gebruiker?.id
    if (laatste && userId) {
      slaNotitieOpInSupabase(laatste, userId)
        .catch(err => console.error('Supabase notitie sync mislukt:', err))
    }
  }

  // Ruim alle lopende sync-timers op bij unmount.
  useEffect(() => {
    const timers = syncTimers.current
    return () => { timers.forEach(clearTimeout); timers.clear() }
  }, [])

  function maakNieuw(type: NotitieType) {
    const n = nieuweNotitie(type)
    setNotities(prev => slaNotitieOp(n, prev))
    planRemoteSync(n)
    setNieuwKeuzeOpen(false)
    setDetailNotitie(n)
  }

  function handleWijzigNotitie(n: Notitie) {
    setNotities(prev => slaNotitieOp(n, prev))
    planRemoteSync(n)
  }

  function handleVerwijderNotitie(id: string) {
    const timer = syncTimers.current.get(id)
    if (timer) clearTimeout(timer)
    syncTimers.current.delete(id)
    pendingSync.current.delete(id)

    setNotities(prev => verwijderNotitie(id, prev))
    setDetailNotitie(null)
    verwijderNotitieUitSupabase(id)
      .catch(err => console.error('Supabase notitie verwijder sync mislukt:', err))
  }

  function sluitDetail() {
    const open = detailNotitie
    setDetailNotitie(null)
    if (!open) return

    // Pak de meest recente versie (pending wijziging of huidige state).
    const huidige = pendingSync.current.get(open.id) ?? notities.find(n => n.id === open.id)
    if (!huidige) return

    if (isLeeg(huidige)) {
      // Volledig lege notitie stil opruimen (iOS Notes-gedrag).
      handleVerwijderNotitie(open.id)
    } else {
      flushRemoteSync(open.id)
    }
  }

  // ── Label CRUD (optimistisch lokaal + directe remote sync) ───────────────────

  function handleOpslaanLabel(label: Label) {
    setLabels(prev => slaLabelOp(label, prev))
    const userId = gebruiker?.id
    if (userId) {
      slaLabelOpInSupabase(label, userId)
        .catch(err => console.error('Supabase label sync mislukt:', err))
    }
  }

  // Verwijdert het label en stript het id uit alle notes — de notes zelf blijven
  // altijd bestaan. Bewust zonder gewijzigdOp-bump: opruimen is geen inhoudelijke
  // wijziging, dus de kaartvolgorde blijft staan.
  function handleVerwijderLabel(id: string) {
    setLabels(prev => verwijderLabel(id, prev))
    verwijderLabelUitSupabase(id)
      .catch(err => console.error('Supabase label verwijder sync mislukt:', err))

    const getroffen = notities.filter(n => n.labelIds.includes(id))
    if (getroffen.length === 0) return

    const bijgewerkt = notities.map(n =>
      n.labelIds.includes(id) ? { ...n, labelIds: n.labelIds.filter(l => l !== id) } : n
    )
    setNotities(bijgewerkt)
    slaAlleNotitiesOp(bijgewerkt)

    const userId = gebruiker?.id
    if (userId) {
      const geschoond = bijgewerkt.filter(n => getroffen.some(g => g.id === n.id))
      slaVeelNotitiesOpInSupabase(geschoond, userId)
        .catch(err => console.error('Supabase labelIds opschonen mislukt:', err))
    }
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
        setDetailNotitie(null)
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

  // Actieve (niet-gearchiveerde) notities, nieuwste wijziging eerst.
  const actieveNotities = useMemo(
    () => notities
      .filter(n => !n.gearchiveerd)
      .sort((a, b) => b.gewijzigdOp.localeCompare(a.gewijzigdOp)),
    [notities],
  )
  const gearchiveerdeAantal = notities.length - actieveNotities.length

  // Placeholder-teksten voor latere fases.
  function placeholderTekst(soort: Exclude<PlaceholderSoort, null>): string {
    switch (soort) {
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

  return (
    <div className="h-full flex bg-gray-50">
      {/* Desktop-sidebar (verborgen op mobiel) */}
      <Sidebar
        weergave={weergave}
        onWeergaveChange={setWeergave}
        onLabels={() => setLabelBeheerOpen(true)}
        onMappen={() => setPlaceholder('mappen')}
        onInstellingen={() => setPlaceholder('instellingen')}
      />

      {/* Hoofdkolom */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          titel={WEERGAVE_TITELS[weergave]}
          onNieuw={() => setNieuwKeuzeOpen(true)}
          onProfielMenu={() => setProfielMenuOpen(true)}
          gebruikerEmail={gebruiker.email}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {weergave === 'archief' ? (
            <EmptyState
              icon={<Archive size={40} className="text-gray-300" />}
              titel="Archief is leeg"
              tekst={gearchiveerdeAantal > 0
                ? `${gearchiveerdeAantal} gearchiveerde notitie${gearchiveerdeAantal === 1 ? '' : 's'} — de archiefweergave komt in Fase 7.`
                : 'Gearchiveerde notities en lijstjes verschijnen hier.'}
            />
          ) : actieveNotities.length > 0 ? (
            <NotitieGrid notities={actieveNotities} labels={labels} onOpen={setDetailNotitie} />
          ) : (
            <EmptyState
              icon={<StickyNote size={40} className="text-gray-300" />}
              titel="Nog geen notities"
              tekst="Tik op + om je eerste notitie of lijstje te maken."
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
      <NieuwKeuze
        open={nieuwKeuzeOpen}
        onKies={maakNieuw}
        onSluit={() => setNieuwKeuzeOpen(false)}
      />
      {detailNotitie && (
        <NotitieDetail
          notitie={detailNotitie}
          labels={labels}
          onWijzig={handleWijzigNotitie}
          onVerwijder={handleVerwijderNotitie}
          onSluit={sluitDetail}
        />
      )}
      <LabelBeheer
        open={labelBeheerOpen}
        labels={labels}
        onOpslaan={handleOpslaanLabel}
        onVerwijder={handleVerwijderLabel}
        onSluit={() => setLabelBeheerOpen(false)}
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
