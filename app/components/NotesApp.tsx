'use client'

import { useState, useEffect } from 'react'
import { Archive, StickyNote } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Weergave } from '@/types'
import { supabase } from '@/lib/supabase'
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

// Placeholder-teksten voor functionaliteit uit latere fases (zie fases.md).
type PlaceholderSoort = 'nieuw' | 'labels' | 'mappen' | 'instellingen' | null

const PLACEHOLDERS: Record<Exclude<PlaceholderSoort, null>, { titel: string; tekst: string }> = {
  nieuw:        { titel: 'Nieuwe notitie', tekst: 'Notities en lijstjes aanmaken komt in Fase 3.' },
  labels:       { titel: 'Labels',         tekst: 'Labels beheren komt in Fase 4.' },
  mappen:       { titel: 'Mappen',         tekst: 'Mappen beheren komt in Fase 6.' },
  instellingen: { titel: 'Instellingen',   tekst: 'Instellingen komen in Fase 8.' },
}

export default function NotesApp() {
  // Auth
  const [gebruiker, setGebruiker] = useState<User | null>(null)
  const [klaar, setKlaar]         = useState(false)

  // Navigatie & modals
  const [weergave, setWeergave]               = useState<Weergave>('alle')
  const [profielMenuOpen, setProfielMenuOpen] = useState(false)
  const [placeholder, setPlaceholder]         = useState<PlaceholderSoort>(null)

  // ── Auth init ────────────────────────────────────────────────────────────────
  // Fase 2 breidt dit uit met het laden van data: localStorage direct tonen,
  // daarna stille achtergrond-sync met Supabase + realtime updates (agenda-patroon).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setGebruiker(session?.user ?? null)
      setKlaar(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setGebruiker(session?.user ?? null)
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

  function uitloggen() {
    supabase.auth.signOut()
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
              tekst="Gearchiveerde notities en lijstjes verschijnen hier."
            />
          ) : (
            <EmptyState
              icon={<StickyNote size={40} className="text-gray-300" />}
              titel="Nog geen notities"
              tekst="Vanaf Fase 3 kun je hier notities en lijstjes aanmaken."
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
          titel={PLACEHOLDERS[placeholder].titel}
          tekst={PLACEHOLDERS[placeholder].tekst}
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
