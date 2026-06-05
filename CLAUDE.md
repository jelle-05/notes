# CLAUDE.md — Notes-app

Persoonlijke notes-app (notities + afvinkbare lijstjes, labels, mappen, archief). Zusterproject van de agenda-app in `D:\jelle\agenda` — dat project is de **referentie voor alle patronen en stijl**, maar mag nooit gewijzigd worden.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript strict
- Tailwind CSS v4 — geen `tailwind.config`; tokens via `@theme inline` in `app/globals.css`
- Lucide React (iconen), npm
- Supabase: PostgreSQL + Auth + Realtime — **zelfde Supabase-project als de agenda-app** (gedeelde users; eigen tabellen met `notes_`-prefix, zie fases.md Fase 2)
- Vercel, domein `notes.jellebol.nl`; PWA via `app/manifest.ts` + `public/sw.js`

## Conventies

- **Nederlands overal**: UI-teksten, types, variabelen, comments (agenda-conventie).
- Alle componenten `'use client'`; state op rootniveau in `NotesApp.tsx`, props drilling — geen context/Zustand.
- Modals: `fixed inset-0` + backdrop; bottom-sheet op mobiel (`items-end`, `rounded-t-2xl`), gecentreerd op desktop (`sm:items-center`, `rounded-2xl`).
- Responsive: mobile-first, `sm:` (640px). Desktop = Sidebar, mobiel = BottomBar (`sm:hidden` / `hidden sm:flex`).
- Stijl: iOS-geïnspireerd licht thema, accent `#007AFF`, safe-area CSS (`env(safe-area-inset-*)`).
- Offline-first (vanaf Fase 2): localStorage direct tonen → achtergrond-sync → Supabase Realtime (agenda-patroon, zie `D:\jelle\agenda\app\lib\opslag.ts` en `supabaseOpslag.ts`).

## Structuur

```
app/
  components/
    NotesApp.tsx       — hoofdcomponent: auth, data-state, sync, realtime, CRUD, modals
    NotitieGrid.tsx / NotitieKaart.tsx — kaartenoverzicht
    NotitieDetail.tsx  — detailweergave + editor ineen (auto-save, eigen draft)
    NieuwKeuze.tsx     — keuzemodal Notitie/Lijst bij ＋
    ZoekFilterBalk.tsx — zoekveld + label-filterpills boven het grid
    KopieerKnop.tsx    — kopieer-als-tekst met 2s feedback
    LabelBeheer.tsx    — labelbeheer (kopie agenda: presets, color picker, contrast-warning)
    LabelPill.tsx      — label-pill met eventKleuren()-kleurresolutie
    MapBeheer.tsx      — mappenbeheer (LabelBeheer-patroon: lijst ↔ bewerk, twee-staps delete)
    MapKiezer.tsx      — mobiele mappen-sheet (filter kiezen + naar beheer)
    Sidebar.tsx        — desktop-navigatie + mappensectie (incl. externe agenda-link)
    BottomBar.tsx      — mobiele tabs
    TopBar.tsx         — titel + nieuw + profiel
    PlaceholderModal.tsx — tijdelijk, voor features uit latere fases
    LoginPagina / ProfielMenu / ErrorBoundary / SwRegistratie
  lib/
    supabase.ts        — Supabase client
    opslag.ts          — localStorage cache (offline-first)
    supabaseOpslag.ts  — CRUD + camelCase↔snake_case converters per tabel
    kopieer.ts         — notitieAlsTekst() + kopieerNaarKlembord() (met fallback)
    kleuren.ts         — eventKleuren(), contrastRatio(), alpha-helpers (kopie agenda)
    helpers.ts         — factories, isLeeg(), formatDatumKort(), metGewijzigdOp()
  types.ts             — Notitie, LijstItem, Label, NotitieMap, Instellingen, Weergave
supabase/schema.sql    — uitvoerbaar databaseschema (tabellen, RLS, indexes)
scripts/generate-icons.mjs — PWA-iconen genereren vanuit public/icon.svg
```

## Datamodel (zie supabase/schema.sql)

- **`notes`** — beide soorten content (`type`: 'notitie' | 'lijst'); checklist-items als jsonb (`items`), labels als `label_ids text[]`, `map_id` (null = geen map), `gearchiveerd`/`gearchiveerd_op`, client-managed `gewijzigd_op` (basis voor auto-archief in Fase 8).
- **`notes_labels`** — eigen labels, zelfde kolomvorm als agenda's `labels` (LabelBeheer 1:1 herbruikbaar).
- **`notes_mappen`** — platte mappen; verwijderen zet `map_id` van notes op null (geen cascade).
- **`notes_instellingen`** — één rij per user: `auto_archief_aan`, `auto_archief_dagen` (default 30).
- Alles per-user met RLS (`auth.uid() = user_id`); geen DB-triggers — timestamps zet de client.
- Sync is **fail-open**: als tabellen/netwerk ontbreken draait de app door op localStorage.

## Opslagflow notities (Fase 3)

Auto-save, geen Opslaan-knop: wijziging → optimistisch in state + localStorage →
**gedebouncede** Supabase-upsert (600 ms per note, laatste wint; flush bij sluiten).
Volledig lege notes worden bij sluiten stil verwijderd. Verwijderen = twee-staps
bevestiging. De detail-editor houdt een eigen draft (gereset op note-id) zodat
realtime-herlaad een open editor nooit overschrijft.

## Labels (Fase 4)

Koppeling via `labelIds: string[]` op de note (geen join-table). Pills kleuren
via `eventKleuren(label)`: eigen achtergrond-/tekstkleur of een lichte tint van
de basiskleur. Kaarten tonen max 3 pills + "+n"; verwijderde label-ids worden
stil overgeslagen bij rendering. Label verwijderen stript het id uit alle notes
(zonder gewijzigdOp-bump) — notes blijven altijd bestaan.

**Kaartkleur**: een note met labels krijgt de achtergrondkleur van zijn
**eerste** label (`labelIds[0]`, geen extra opslagveld); tekst op de kaart in
`eventKleuren().tekst`, pills in de `opKleur`-variant (wit + basiskleur) zodat
ze niet wegvallen. Bij 2+ labels verschijnt in de detailweergave de vraag
"Welke kleur krijgt de kaart?" — kiezen zet dat label vooraan in `labelIds`.
Kaarten hebben geen schaduw (alleen border).

## Zoeken & filteren (Fase 5)

Volledig client-side als **afgeleide state**: één `useMemo` (`getoondeNotities`)
bovenop `actieveNotities` — geen Supabase-queries per toetsaanslag, geen
search-library. Filterketen: map (**AND**) → labels (**OR**: minstens één
actief label) → zoekterm. Togglen kan via een pill op de kaart of via
`ZoekFilterBalk`. Ids van verwijderde labels worden bij het filteren genegeerd
én bij lokaal verwijderen uit `actieveLabelIds` gestript — nooit kapotte
filterstate. Zoeken: getrimd, case-insensitive, over titel, inhoud en
checklist-itemteksten. Gearchiveerde notes zitten nooit in de resultaten.
`NotitieKaart` is een `div role="button"` (pills zijn zelf buttons).

## Mappen (Fase 6)

Platte mappen, alleen een naam (de `kleur`-kolom blijft ongebruikt; geen
`gewijzigd_op` — hernoemen is een hele-rij-upsert). Beheer via `MapBeheer`
(LabelBeheer-patroon); desktop kiest een map in de Sidebar-sectie, mobiel via
de `MapKiezer`-sheet vanaf de Mappen-tab. Mapfilter zit in `actieveMapId`:
`null` = alles, sentinel `GEEN_MAP_FILTER` = notities zonder map, anders een
map-id — AND met zoek/labels; actieve map = TopBar-titel + blauwe chip in de
filterbalk. Map kiezen per note in `NotitieDetail` (sectie boven Labels) via
het auto-save-pad. **Map verwijderen** zet `mapId` van alle notes erin (ook
gearchiveerde) op undefined zonder `gewijzigdOp`-bump en reset het actieve
filter; een realtime-verwijdering vanaf een ander apparaat wordt render-time
genegeerd. "Alle notities"/Notities-tab wist het mapfilter.

## Kopieerfunctie

`KopieerKnop` in de detail-header kopieert de note als **platte tekst**: titel +
lege regel + inhoud; checklists per regel `[x] item` / `[ ] item`. Geen
labels/metadata. Clipboard API met textarea/execCommand-fallback; tekst wordt
synchroon in de onClick opgebouwd (iOS user-gesture-eis). Feedback: 2 s
"Gekopieerd", nette foutmelding bij falen.

## Werkwijze

- Werk fase voor fase volgens `fases.md`; vink taken daar af.
- `npm run lint` + `npm run build` moeten groen zijn vóór commit; commit per werkende feature (Vercel deployt automatisch op push naar `main`).
- Geen secrets in code/docs. Env-vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local`, gitignored).

## Status

- ✅ Fase 0 — analyse agenda-app (zie fases.md)
- ✅ Fase 1 — projectbasis + navigatie-shell + auth-skelet
- ✅ Fase 2 — datamodel (`supabase/schema.sql`) + offline-first opslag/sync-laag
- ✅ Fase 3 — notes/checklist-UI + kopieerfunctie (auto-save, debounced sync)
- ✅ Fase 4 — labels (LabelBeheer uit agenda, pills, koppelen in detailweergave)
- ✅ Fase 5 — filteren op labels (OR) + live zoeken; mapfilter technisch voorbereid
- ✅ Fase 6 — mappen (beheer, sidebar-sectie + mobiele sheet, map kiezen per note, veilige verwijderflow)
- ⏭️ Fase 7 — archief (archiveren/terugzetten, archiefweergave)
