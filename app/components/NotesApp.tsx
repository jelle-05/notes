'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Archive, Folder, SearchX, StickyNote } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Weergave, Notitie, NotitieType, Label, NotitieMap, Instellingen } from '@/types'
import { STANDAARD_INSTELLINGEN, GEEN_MAP_FILTER } from '@/types'
import { supabase } from '@/lib/supabase'
import { nieuweNotitie, isLeeg, metGewijzigdOp, nuIso } from '@/lib/helpers'
import { vindAutoArchiefKandidaten, clampArchiefDagen } from '@/lib/archief'
import {
  laadNotities, slaNotitieOp, verwijderNotitie, slaAlleNotitiesOp,
  laadLabels, slaLabelOp, verwijderLabel, slaAlleLabelsOp,
  laadMappen, slaMapOp, verwijderMap, slaAlleMappenOp,
  laadInstellingen, slaInstellingenOp,
} from '@/lib/opslag'
import {
  laadNotitiesVanSupabase, slaNotitieOpInSupabase, slaVeelNotitiesOpInSupabase, verwijderNotitieUitSupabase,
  laadLabelsVanSupabase, slaLabelOpInSupabase, verwijderLabelUitSupabase,
  laadMappenVanSupabase, slaMapOpInSupabase, verwijderMapUitSupabase,
  laadInstellingenVanSupabase, slaInstellingenOpInSupabase, uploadNaarSupabase,
} from '@/lib/supabaseOpslag'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomBar from './BottomBar'
import LoginPagina from './LoginPagina'
import ProfielMenu from './ProfielMenu'
import InstellingenMenu from './InstellingenMenu'
import NotitieGrid from './NotitieGrid'
import NotitieDetail from './NotitieDetail'
import NieuwKeuze from './NieuwKeuze'
import LabelBeheer from './LabelBeheer'
import MapBeheer from './MapBeheer'
import MapKiezer from './MapKiezer'
import ZoekFilterBalk from './ZoekFilterBalk'

// Titels per weergave voor de TopBar.
const WEERGAVE_TITELS: Record<Weergave, string> = {
  alle:    'Notities',
  map:     'Mappen',
  archief: 'Archief',
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
  const [instellingenOpen, setInstellingenOpen] = useState(false)
  const [nieuwKeuzeOpen, setNieuwKeuzeOpen]   = useState(false)
  const [detailNotitie, setDetailNotitie]     = useState<Notitie | null>(null)
  const [labelBeheerOpen, setLabelBeheerOpen] = useState(false)
  const [mapBeheerOpen, setMapBeheerOpen]     = useState(false)
  const [mapKiezerOpen, setMapKiezerOpen]     = useState(false)   // mobiele mappen-sheet
  // Gezet via ⋯ achter een map in de sidebar: MapBeheer opent dan direct in bewerk-modus.
  const [mapBewerkStart, setMapBewerkStart]   = useState<NotitieMap | null>(null)

  // Zoeken & filteren (client-side, afgeleide state — zie getoondeNotities)
  const [zoekterm, setZoekterm]               = useState('')
  const [actieveLabelIds, setActieveLabelIds] = useState<string[]>([])
  // null = geen mapfilter; GEEN_MAP_FILTER = notities zonder map; anders map-id.
  const [actieveMapId, setActieveMapId]       = useState<string | null>(null)

  // Debounced remote sync: per notitie één timer; de laatste versie wint.
  const syncTimers  = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pendingSync = useRef(new Map<string, Notitie>())

  // Auto-archief draait pas ná de eerste Supabase-sync (geen stale cache) en
  // maximaal één keer per sessie; de ref wordt gereset als de toggle aangaat.
  const [syncKlaar, setSyncKlaar]   = useState(false)
  const autoArchiefGedraaid         = useRef(false)

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

  // Archiveert of herstelt een note. Discrete actie: direct naar Supabase
  // (geen debounce); een eventuele lopende debounce-timer wordt geannuleerd.
  // Terugzetten bumpt gewijzigdOp zodat de note voorspelbaar bovenaan het
  // actieve grid komt én niet direct opnieuw auto-gearchiveerd wordt (Fase 8).
  function handleArchiveerToggle(id: string) {
    const huidige = pendingSync.current.get(id) ?? notities.find(n => n.id === id)
    if (!huidige) return

    const timer = syncTimers.current.get(id)
    if (timer) clearTimeout(timer)
    syncTimers.current.delete(id)
    pendingSync.current.delete(id)

    const bijgewerkt = metGewijzigdOp(
      huidige.gearchiveerd
        ? { ...huidige, gearchiveerd: false, gearchiveerdOp: undefined }
        : { ...huidige, gearchiveerd: true, gearchiveerdOp: nuIso() }
    )
    setNotities(prev => slaNotitieOp(bijgewerkt, prev))
    setDetailNotitie(null)

    const userId = gebruiker?.id
    if (userId) {
      slaNotitieOpInSupabase(bijgewerkt, userId)
        .catch(err => console.error('Supabase archief sync mislukt:', err))
    }
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
    // Verwijderd label mag geen kapotte filterstate achterlaten.
    setActieveLabelIds(prev => prev.filter(l => l !== id))
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

  // ── Map CRUD (optimistisch lokaal + directe remote sync) ─────────────────────

  function handleOpslaanMap(map: NotitieMap) {
    setMappen(prev => slaMapOp(map, prev))
    const userId = gebruiker?.id
    if (userId) {
      slaMapOpInSupabase(map, userId)
        .catch(err => console.error('Supabase map sync mislukt:', err))
    }
  }

  // Verwijdert de map en zet de notities erin terug naar "Geen map" — de
  // notities zelf blijven altijd bestaan. Bewust zonder gewijzigdOp-bump
  // (zelfde keuze als bij labels): opruimen is geen inhoudelijke wijziging,
  // dus de kaartvolgorde blijft staan. Labelkoppelingen blijven onaangetast.
  function handleVerwijderMap(id: string) {
    setMappen(prev => verwijderMap(id, prev))
    // Verwijderde map mag niet als actief filter blijven hangen.
    setActieveMapId(prev => (prev === id ? null : prev))
    verwijderMapUitSupabase(id)
      .catch(err => console.error('Supabase map verwijder sync mislukt:', err))

    const getroffen = notities.filter(n => n.mapId === id)
    if (getroffen.length === 0) return

    const bijgewerkt = notities.map(n =>
      n.mapId === id ? { ...n, mapId: undefined } : n
    )
    setNotities(bijgewerkt)
    slaAlleNotitiesOp(bijgewerkt)

    const userId = gebruiker?.id
    if (userId) {
      const geschoond = bijgewerkt.filter(n => getroffen.some(g => g.id === n.id))
      slaVeelNotitiesOpInSupabase(geschoond, userId)
        .catch(err => console.error('Supabase mapId opschonen mislukt:', err))
    }
  }

  // ── Instellingen ─────────────────────────────────────────────────────────────

  // Direct opslaan (optimistisch lokaal + remote fail-open). Gaat de toggle
  // uit→aan, dan mag auto-archief deze sessie direct opnieuw controleren.
  function handleWijzigInstellingen(nieuw: Instellingen) {
    const geclampt: Instellingen = { ...nieuw, autoArchiefDagen: clampArchiefDagen(nieuw.autoArchiefDagen) }
    if (geclampt.autoArchiefAan && !instellingen.autoArchiefAan) {
      autoArchiefGedraaid.current = false
    }
    setInstellingen(geclampt)
    slaInstellingenOp(geclampt)

    const userId = gebruiker?.id
    if (userId) {
      slaInstellingenOpInSupabase(geclampt, userId)
        .catch(err => console.error('Supabase instellingen sync mislukt:', err))
    }
  }

  // ── Zoeken & filteren ────────────────────────────────────────────────────────

  // Label-filter aan/uit togglen; includes-check voorkomt dubbele filters.
  function toggleLabelFilter(id: string) {
    setActieveLabelIds(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    )
  }

  // Mapfilter kiezen (sidebar, mobiele sheet): null = alle notities.
  function kiesMapFilter(id: string | null) {
    setActieveMapId(id)
    setWeergave('alle')
    setMapKiezerOpen(false)
  }

  // Weergave-switch via navigatie; terug naar "alle" wist het mapfilter
  // (Notities-tab / "Alle notities" betekent: toon álles).
  function gaNaarWeergave(w: Weergave) {
    setWeergave(w)
    if (w === 'alle') setActieveMapId(null)
  }

  function wisFilters() {
    setZoekterm('')
    setActieveLabelIds([])
    setActieveMapId(null)
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
        // Sync Supabase stil op de achtergrond; daarna mag auto-archief draaien
        achtergrondSync().finally(() => setSyncKlaar(true))
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
        initialiseerData(user.id).finally(() => { setKlaar(true); setSyncKlaar(true) })
      } else if (event === 'SIGNED_OUT') {
        setNotities([])
        setLabels([])
        setMappen([])
        setInstellingen(STANDAARD_INSTELLINGEN)
        setDetailNotitie(null)
        setSyncKlaar(false)
        autoArchiefGedraaid.current = false
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

  // ── Automatisch archiveren (Fase 8) ──────────────────────────────────────────
  // Draait stil bij app-start, ná de eerste Supabase-sync (verse data, dus geen
  // hele-rij-upsert over nieuwere remote edits heen) en maximaal één keer per
  // sessie; opnieuw wanneer de toggle uit→aan gaat. Zelfde statusovergang als
  // handmatig archiveren (Fase 7), als bulk-upsert. Idempotent: gearchiveerde
  // notes zijn nooit kandidaat en teruggezette notes hebben een verse
  // gewijzigdOp (de bump uit Fase 7), dus die blijven buiten de drempel.
  useEffect(() => {
    if (!syncKlaar || !gebruiker || !instellingen.autoArchiefAan) return
    if (autoArchiefGedraaid.current) return
    autoArchiefGedraaid.current = true

    const kandidaten = vindAutoArchiefKandidaten(notities, instellingen)
    if (kandidaten.length === 0) return

    const nu = nuIso()
    const ids = new Set(kandidaten.map(k => k.id))
    const bijgewerkt = notities.map(n =>
      ids.has(n.id)
        ? metGewijzigdOp({ ...n, gearchiveerd: true, gearchiveerdOp: nu })
        : n
    )
    // Bewust eenmalige state-update (guard-ref hierboven voorkomt cascades).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotities(bijgewerkt)
    slaAlleNotitiesOp(bijgewerkt)
    slaVeelNotitiesOpInSupabase(bijgewerkt.filter(n => ids.has(n.id)), gebruiker.id)
      .catch(err => console.error('Supabase auto-archief sync mislukt:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKlaar, gebruiker, instellingen])

  // Actieve (niet-gearchiveerde) notities, nieuwste wijziging eerst.
  const actieveNotities = useMemo(
    () => notities
      .filter(n => !n.gearchiveerd)
      .sort((a, b) => b.gewijzigdOp.localeCompare(a.gewijzigdOp)),
    [notities],
  )
  // Gearchiveerde notities, nieuwst gearchiveerd eerst.
  const gearchiveerdeNotities = useMemo(
    () => notities
      .filter(n => n.gearchiveerd)
      .sort((a, b) =>
        (b.gearchiveerdOp ?? b.gewijzigdOp).localeCompare(a.gearchiveerdOp ?? a.gewijzigdOp)
      ),
    [notities],
  )

  // Mappen alfabetisch voor sidebar, kiezers en beheer.
  const gesorteerdeMappen = useMemo(
    () => [...mappen].sort((a, b) => a.naam.localeCompare(b.naam, 'nl')),
    [mappen],
  )

  // Aantal notities per map (incl. gearchiveerde — die verhuizen óók mee
  // wanneer een map verwijderd wordt).
  const aantalPerMap = useMemo(() => {
    const telling: Record<string, number> = {}
    for (const n of notities) {
      if (n.mapId) telling[n.mapId] = (telling[n.mapId] ?? 0) + 1
    }
    return telling
  }, [notities])

  // De actieve map opzoeken; een (op een ander apparaat) verwijderde map levert
  // undefined op en het filter wordt dan stil genegeerd — nooit kapotte state.
  const actieveMap = useMemo(
    () => actieveMapId && actieveMapId !== GEEN_MAP_FILTER
      ? mappen.find(m => m.id === actieveMapId)
      : undefined,
    [mappen, actieveMapId],
  )
  const mapFilterActief = actieveMapId === GEEN_MAP_FILTER || actieveMap !== undefined

  // Zoek- en filterresultaat als afgeleide state op actieveNotities:
  // map (AND) → labels (OR: minstens één actief label) → zoekterm (titel,
  // inhoud en checklist-items, case-insensitive). Sortering blijft die van
  // actieveNotities; realtime/localStorage-updates werken automatisch door.
  const getoondeNotities = useMemo(() => {
    let resultaat = actieveNotities

    if (actieveMapId === GEEN_MAP_FILTER) {
      resultaat = resultaat.filter(n => !n.mapId)
    } else if (actieveMap) {
      resultaat = resultaat.filter(n => n.mapId === actieveMap.id)
    }

    // Alleen filteren op labels die nog bestaan — een (op een ander apparaat)
    // verwijderd label wordt stil genegeerd in plaats van alles te verbergen.
    const geldigeFilterIds = actieveLabelIds.filter(id => labels.some(l => l.id === id))
    if (geldigeFilterIds.length > 0) {
      resultaat = resultaat.filter(n => geldigeFilterIds.some(id => n.labelIds.includes(id)))
    }

    const term = zoekterm.trim().toLowerCase()
    if (term !== '') {
      resultaat = resultaat.filter(n =>
        n.titel.toLowerCase().includes(term) ||
        n.inhoud.toLowerCase().includes(term) ||
        n.items.some(i => i.tekst.toLowerCase().includes(term))
      )
    }

    return resultaat
  }, [actieveNotities, actieveMapId, actieveMap, actieveLabelIds, labels, zoekterm])

  const heeftActieveFilters = zoekterm.trim() !== '' || actieveLabelIds.length > 0 || mapFilterActief
  // Alleen een mapfilter actief (geen zoek/labels) → "lege map"-empty-state.
  const alleenMapFilter = mapFilterActief && zoekterm.trim() === '' && actieveLabelIds.length === 0

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
        mappen={gesorteerdeMappen}
        actieveMapId={mapFilterActief ? actieveMapId : null}
        onWeergaveChange={gaNaarWeergave}
        onKiesMap={kiesMapFilter}
        onLabels={() => setLabelBeheerOpen(true)}
        onMapBeheer={() => { setMapBewerkStart(null); setMapBeheerOpen(true) }}
        onMapBewerk={map => { setMapBewerkStart(map); setMapBeheerOpen(true) }}
        onInstellingen={() => setInstellingenOpen(true)}
      />

      {/* Hoofdkolom */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          titel={weergave === 'alle' && mapFilterActief
            ? (actieveMap?.naam ?? 'Geen map')
            : WEERGAVE_TITELS[weergave]}
          onNieuw={() => setNieuwKeuzeOpen(true)}
          onProfielMenu={() => setProfielMenuOpen(true)}
          gebruikerEmail={gebruiker.email}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {weergave === 'archief' ? (
            gearchiveerdeNotities.length > 0 ? (
              <NotitieGrid
                notities={gearchiveerdeNotities}
                labels={labels}
                onOpen={setDetailNotitie}
                gedempt
                onZetTerug={handleArchiveerToggle}
              />
            ) : (
              <EmptyState
                icon={<Archive size={40} className="text-gray-300" />}
                titel="Archief is leeg"
                tekst="Gearchiveerde notities en lijstjes verschijnen hier."
              />
            )
          ) : actieveNotities.length > 0 ? (
            <div className="min-h-full flex flex-col">
              <ZoekFilterBalk
                zoekterm={zoekterm}
                onZoek={setZoekterm}
                labels={labels}
                actieveLabelIds={actieveLabelIds}
                mapFilterNaam={mapFilterActief ? (actieveMap?.naam ?? 'Geen map') : null}
                onToggleLabel={toggleLabelFilter}
                onWisMapFilter={() => setActieveMapId(null)}
                onWisFilters={wisFilters}
              />
              {getoondeNotities.length > 0 ? (
                <NotitieGrid
                  notities={getoondeNotities}
                  labels={labels}
                  onOpen={setDetailNotitie}
                  onLabelKlik={toggleLabelFilter}
                />
              ) : alleenMapFilter ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <Folder size={40} className="text-gray-300" />
                  <h2 className="text-[17px] font-semibold text-gray-900">
                    {actieveMapId === GEEN_MAP_FILTER ? 'Geen losse notities' : 'Deze map is leeg'}
                  </h2>
                  <p className="text-[14px] text-gray-400 max-w-[280px]">
                    {actieveMapId === GEEN_MAP_FILTER
                      ? 'Alle notities zitten in een map.'
                      : 'Verplaats notities hierheen via de detailweergave.'}
                  </p>
                  <button
                    onClick={() => setActieveMapId(null)}
                    className="text-[14px] font-semibold text-[#007AFF] hover:text-[#0066D6] transition-colors"
                  >
                    Toon alle notities
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <SearchX size={40} className="text-gray-300" />
                  <h2 className="text-[17px] font-semibold text-gray-900">Geen resultaten</h2>
                  <p className="text-[14px] text-gray-400 max-w-[280px]">Pas je zoekterm of filters aan.</p>
                  {heeftActieveFilters && (
                    <button
                      onClick={wisFilters}
                      className="text-[14px] font-semibold text-[#007AFF] hover:text-[#0066D6] transition-colors"
                    >
                      Wis filters
                    </button>
                  )}
                </div>
              )}
            </div>
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
          mapFilterActief={mapFilterActief}
          onWeergaveChange={gaNaarWeergave}
          onMappen={() => setMapKiezerOpen(true)}
        />
      </div>

      {/* Modals */}
      <ProfielMenu
        open={profielMenuOpen}
        email={gebruiker.email ?? ''}
        onInstellingen={() => setInstellingenOpen(true)}
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
          mappen={gesorteerdeMappen}
          onWijzig={handleWijzigNotitie}
          onArchiveerToggle={handleArchiveerToggle}
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
      <MapKiezer
        open={mapKiezerOpen}
        mappen={gesorteerdeMappen}
        actieveMapId={mapFilterActief ? actieveMapId : null}
        onKies={kiesMapFilter}
        onBeheer={() => { setMapKiezerOpen(false); setMapBewerkStart(null); setMapBeheerOpen(true) }}
        onSluit={() => setMapKiezerOpen(false)}
      />
      <MapBeheer
        open={mapBeheerOpen}
        mappen={gesorteerdeMappen}
        aantalPerMap={aantalPerMap}
        startMap={mapBewerkStart}
        onOpslaan={handleOpslaanMap}
        onVerwijder={handleVerwijderMap}
        onSluit={() => { setMapBeheerOpen(false); setMapBewerkStart(null) }}
      />
      <InstellingenMenu
        open={instellingenOpen}
        instellingen={instellingen}
        onWijzig={handleWijzigInstellingen}
        onSluit={() => setInstellingenOpen(false)}
      />
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
