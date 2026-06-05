# CLAUDE.md — Notes-app

Persoonlijke notes-app (notities + afvinkbare lijstjes, labels, mappen, archief). Zusterproject van de agenda-app in `D:\jelle\agenda` — dat project is de **referentie voor alle patronen en stijl**, maar mag nooit gewijzigd worden.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript strict
- Tailwind CSS v4 — geen `tailwind.config`; tokens via `@theme inline` in `app/globals.css`
- Lucide React (iconen), npm
- Supabase: PostgreSQL + Auth + Realtime — **zelfde Supabase-project als de agenda-app** (gedeelde users; eigen tabellen met `notes_`-prefix, zie fases.md Fase 2)
- Vercel, domein `notes.jellebol.nl`; PWA via `app/manifest.ts` + `public/sw.js`
- **Iconen**: `public/icon.svg` is de ene bron — `scripts/generate-icons.mjs` genereert de PNG's (192/512/maskable/apple-touch); `metadata.icons` in `app/layout.tsx` zet favicon (SVG + PNG-fallback) en apple-touch-icon, het manifest gebruikt dezelfde assets → favicon = beginscherm-icoon

## Conventies

- **Nederlands overal**: UI-teksten, types, variabelen, comments (agenda-conventie).
- Alle componenten `'use client'`; state op rootniveau in `NotesApp.tsx`, props drilling — geen context/Zustand.
- Modals: `fixed inset-0` + backdrop; bottom-sheet op mobiel (`items-end`, `rounded-t-2xl`), gecentreerd op desktop (`sm:items-center`, `rounded-2xl`).
- Responsive: mobile-first, `sm:` (640px). Desktop = Sidebar, mobiel = BottomBar (`sm:hidden` / `hidden sm:flex`).
- Stijl: iOS-geïnspireerd licht thema, accent `#007AFF`, safe-area CSS (`env(safe-area-inset-*)`; sheet-bodies via `.modal-safe-bottom`).
- A11y (Fase 9): globale `:focus-visible`-outline + `prefers-reduced-motion` in `globals.css`; modals hebben `role="dialog"`/`aria-modal` en sluiten met Escape (`lib/useEscape.ts`); aria-labels op icon-only knoppen.
- Offline-first (vanaf Fase 2): localStorage direct tonen → achtergrond-sync → Supabase Realtime (agenda-patroon, zie `D:\jelle\agenda\app\lib\opslag.ts` en `supabaseOpslag.ts`).

## Structuur

```
app/
  components/
    NotesApp.tsx       — hoofdcomponent: auth, data-state, sync, realtime, CRUD, modals
    NotitieGrid.tsx / NotitieKaart.tsx — kaartenoverzicht
    NotitieDetail.tsx  — detailweergave + editor ineen (auto-save, eigen draft);
                         map/labels/verwijderen achter de potlood-knop (bewerk-modus)
    NieuwKeuze.tsx     — keuzemodal Notitie/Lijst bij ＋
    ZoekFilterBalk.tsx — zoekveld + label-filterpills boven het grid
    KopieerKnop.tsx    — kopieer-als-tekst met 2s feedback
    LabelBeheer.tsx    — labelbeheer (kopie agenda: presets, color picker, contrast-warning)
    LabelPill.tsx      — label-pill met eventKleuren()-kleurresolutie
    MapBeheer.tsx      — mappenbeheer (LabelBeheer-patroon: lijst ↔ bewerk, kleur, twee-staps delete)
    MapKiezer.tsx      — mobiele mappen-sheet (filter kiezen + naar beheer)
    MapIcoon.tsx       — rond gekleurd mapicoon (kleur op lichtere tint)
    Sidebar.tsx        — desktop-navigatie + mappensectie (incl. externe agenda-link)
    BottomBar.tsx      — mobiele tabs
    TopBar.tsx         — titel + nieuw + profiel
    InstellingenMenu.tsx — instellingen (sectie Archief: auto-archief toggle + dagen)
    LoginPagina / ProfielMenu / ErrorBoundary / SwRegistratie
  lib/
    supabase.ts        — Supabase client
    opslag.ts          — localStorage cache (offline-first)
    supabaseOpslag.ts  — CRUD + camelCase↔snake_case converters per tabel
    kopieer.ts         — notitieAlsTekst() + kopieerNaarKlembord() (met fallback)
    kleuren.ts         — eventKleuren(), contrastRatio(), alpha-helpers (kopie agenda)
    helpers.ts         — factories, isLeeg(), formatDatumKort(), metGewijzigdOp()
    archief.ts         — vindAutoArchiefKandidaten() + clampArchiefDagen() (pure functies)
    useEscape.ts       — Escape sluit de open modal
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

Platte mappen met naam + optionele kleur (geen `gewijzigd_op` — hernoemen is
een hele-rij-upsert). De kleur kleurt het ronde mapicoon (`MapIcoon.tsx`:
icoon in de kleur op een lichtere tint, border-radius 100px) in sidebar,
kiezers en beheer. Beheer via `MapBeheer` (LabelBeheer-patroon, 12 presets +
"geen kleur"); de ⋯-knop achter een mapnaam in de sidebar opent MapBeheer
direct in bewerk-modus (`startMap`-prop). Desktop kiest een map in de
Sidebar-sectie, mobiel via de `MapKiezer`-sheet vanaf de Mappen-tab. Mapfilter zit in `actieveMapId`:
`null` = alles, sentinel `GEEN_MAP_FILTER` = notities zonder map, anders een
map-id — AND met zoek/labels; actieve map = TopBar-titel + blauwe chip in de
filterbalk. Map kiezen per note in `NotitieDetail` (sectie boven Labels) via
het auto-save-pad. **Map verwijderen** zet `mapId` van alle notes erin (ook
gearchiveerde) op undefined zonder `gewijzigdOp`-bump en reset het actieve
filter; een realtime-verwijdering vanaf een ander apparaat wordt render-time
genegeerd. "Alle notities"/Notities-tab wist het mapfilter.

## Archief (Fase 7)

Archiveren via de detailweergave (bewerk-modus, boven Verwijderen); terugzetten
op de archiefkaart (footer-knop) of in de detailweergave. Geen bevestiging
(omkeerbaar), geen debounce (discrete actie → directe upsert, lopende
debounce-timer wordt geannuleerd). Beide overgangen bumpen `gewijzigdOp`
(teruggezet = bovenaan actief grid; voorkomt directe her-archivering door
Fase 8). Archiefweergave: zelfde grid, kaarten gedempt (`opacity-70`), datum =
`gearchiveerdOp`, sortering nieuwst-gearchiveerd eerst; geen zoek/filterbalk.

## Instellingen & auto-archief (Fase 8)

`InstellingenMenu` (via sidebar/ProfielMenu): sectie Archief met toggle
"Automatisch archiveren" (default **uit**) en periode in dagen (default **30**,
clamp 1–3650). Direct opslaan: optimistisch lokaal + fail-open upsert naar
`notes_instellingen` (`onConflict: user_id` → één rij per gebruiker; geen
realtime nodig — geladen bij start). Auto-archief draait **client-side bij
app-start**, ná de eerste Supabase-sync (`syncKlaar`), max. één keer per sessie
(guard-ref; reset bij toggle uit→aan en bij uitloggen). Selectie via de pure
functie `vindAutoArchiefKandidaten()` in `lib/archief.ts` (actief + `gewijzigdOp`
ouder dan drempel, fallback `aangemaaktOp`); overgang = zelfde als handmatig
archiveren (incl. `gewijzigdOp`-bump), als stille bulk-upsert. Teruggezette
notes worden niet direct her-gearchiveerd dankzij de bump uit Fase 7.
Server-side cron blijft optioneel (Fase 10+).

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
- ✅ Fase 7 — archief (archiveren via detail, terugzetten via kaart/detail, gedempte archiefweergave)
- ✅ Fase 8 — instellingen (InstellingenMenu) + automatisch archiveren (client-side bij app-start)
- ✅ Fase 9 — polish & a11y (favicon/app-icon, focus-visible, Escape, safe-area in sheets, reduced motion)
- ⏭️ Fase 10 — testen, documentatie en oplevering
