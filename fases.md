# Fases Notes App

Gefaseerd bouwplan voor een Notes-app in Next.js, maximaal aansluitend op het bestaande agenda-project (`D:\jelle\agenda`, live op https://agenda.jellebol.nl).

## Projectoverzicht

| Onderdeel | Keuze |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@theme inline` in globals.css, geen aparte config) |
| Icons | Lucide React |
| Backend / Auth | Supabase — **zelfde project als agenda** (nieuwe tabellen, zelfde users/login) |
| Opslag | Offline-first: localStorage cache + achtergrond-sync + Supabase Realtime |
| Hosting | Vercel, domein `notes.jellebol.nl` |
| PWA | Ja (manifest + service worker, zoals agenda) |
| Taal | Nederlands (UI, types, variabelen — agenda-conventie) |
| Design | iOS-geïnspireerd, licht thema, `#007AFF` accent |
| Package manager | npm |

---

## Fase 0 - Analyse bestaande agenda-app

**Status: afgerond.** Bevindingen:

### Stack
- **Next.js 16.2.7** (App Router, Turbopack), **React 19.2.4**, **TypeScript** strict mode.
- **Tailwind CSS v4** via `@tailwindcss/postcss` — géén `tailwind.config.js`; design tokens via `@theme inline` in `app/globals.css`.
- **lucide-react** voor iconen, **npm** als package manager.
- Scripts: `dev`, `build`, `start`, `lint` (ESLint 9 + `eslint-config-next`). Geen testsuite.

### Backend / API / database
- **Supabase**: PostgreSQL + Auth (e-mail/wachtwoord) + Realtime (`postgres_changes`).
- Per-user data: elke tabel heeft `user_id` + Row Level Security (`auth.uid() = user_id`).
- API routes onder `app/api/` met `export const runtime = 'nodejs'`; auth via Bearer-token (Supabase), cron-route beveiligd met `X-Cron-Secret` header. Geen server actions.

### Architectuur & data flow
- Single-page app op `/`; alles in één `'use client'` hoofdcomponent (`AgendaApp.tsx`) met state op rootniveau + props drilling. Geen context/Zustand/Redux.
- **Offline-first**: bij mount direct data uit localStorage tonen (`lib/opslag.ts`), daarna achtergrond-sync naar/van Supabase (`lib/supabaseOpslag.ts`, camelCase ↔ snake_case converters), realtime updates via WebSocket.
- Wijziging = optimistische state-update → localStorage → asynchrone Supabase-upsert.

### Routing
- App Router; vrijwel alles op `/` (weergave-switch via state, geen routes per weergave). `/privacy` als enige statische extra pagina. PWA-manifest via `app/manifest.ts`.

### Styling
- iOS-geïnspireerd: wit/lichtgrijs palet, `#1c1c1e` tekst, `#007AFF` (iOS-blauw) accent, `#FF3B30` rood.
- Safe-area CSS (`env(safe-area-inset-*)`) voor notch/home-indicator.
- Modals: `fixed inset-0` overlay, bottom-sheet op mobiel (`items-end`, `rounded-t-2xl`), gecentreerd op desktop (`sm:items-center`, `rounded-2xl`), `max-h-[85vh]`, donkere backdrop die sluit bij klik.
- Geist-font (next/font) met `-apple-system` fallback; subtiele animaties met `prefers-reduced-motion` support.
- Breakpoint: `sm:` (640px) — mobile-first.

### Herbruikbare componenten/patronen (1-op-1 kopieerbaar)
- `lib/supabase.ts` (client), `lib/opslag.ts` + `lib/supabaseOpslag.ts` (cache/sync-patroon), `lib/kleuren.ts` (contrast-ratio, hex-helpers).
- `LoginPagina.tsx`, `ErrorBoundary.tsx`, `SwRegistratie.tsx`, `layout.tsx`, `globals.css`, `manifest.ts`.
- `LabelBeheer.tsx` — compleet labelbeheer met color picker, achtergrond-/tekstkleur en contrast-warning. Vrijwel identiek aan wat de Notes-app nodig heeft.
- `BottomBar.tsx` (mobiele tabs + safe-area), `TopBar.tsx`, modal-patroon, `InstellingenMenu.tsx` (tabstructuur), `ProfielMenu.tsx`.
- Cron-patroon: `app/api/cron/reminders/route.ts` (X-Cron-Secret + service-role client).

### Deployment / config
- Vercel met auto-deploy op push naar `main`. Env-vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (zelfde waarden herbruikbaar), server-side o.a. `SUPABASE_SERVICE_ROLE_KEY` en `CRON_SECRET` (alleen nodig bij latere cron-fase).

### Verschillen t.o.v. agenda
- De agenda heeft **geen desktop-sidebar** (alleen TopBar + mobiele BottomBar). De Notes-app krijgt wél een sidebar — nieuw component, maar in dezelfde stijltaal.
- De agenda heeft geen archief, mappen of zoekfunctie — nieuwe functionaliteit op bestaande patronen.

### Openstaande punten uit de analyse
- Zie sectie **Open vragen** onderaan.

---

## Fase 1 - Projectbasis Notes-app

**Doel:** werkende Next.js-app met login, sync-fundering en navigatie-shell, live op Vercel.

**Status: afgerond** (op de handmatige Vercel-stappen na, zie onderaan).

### Taken
- [x] Next.js project opzetten in `D:\jelle\notes` — **keuze: hand-scaffold i.p.v. `create-next-app`**, zodat de versies exact gelijk zijn aan de agenda (Next 16.2.7, React 19.2.4, Tailwind v4, lucide-react, @supabase/supabase-js) en de agenda-configs 1-op-1 overgenomen konden worden.
- [x] Basisbestanden overnemen/aanpassen uit agenda:
  - `app/globals.css` (safe-area, font, kleuren; agenda-specifieke slide/dot-animaties weggelaten)
  - `app/layout.tsx` (titel "Notities", ErrorBoundary)
  - `app/manifest.ts` (naam "Notities", eigen geel notitie-icoon: `public/icon.svg` + PNG's via `scripts/generate-icons.mjs`)
  - `app/lib/supabase.ts`
  - `app/components/LoginPagina.tsx` (capaciteits-check en privacy-link weggelaten — die API/pagina bestaan hier niet), `ErrorBoundary.tsx`, `SwRegistratie.tsx`
  - configs: `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `next.config.ts`, `.gitignore`
  - `.env.local` met dezelfde `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (zelfde Supabase-project → bestaand agenda-account werkt direct)
  - `public/sw.js` (cache "notes-v1", zonder push-handlers — niet nodig in v1) + `public/offline.html`
- [x] **Auth-skelet** in `NotesApp.tsx` (blauwdruk: `AgendaApp.tsx`): sessie-check, `onAuthStateChange`, LoginPagina, uitloggen, Android back-gesture-fix. De data/sync-laag (localStorage + achtergrond-sync + realtime) komt in Fase 2 — gemarkeerd met comments.
- [x] **Navigatie-shell**:
  - Desktop `Sidebar.tsx` (`hidden sm:flex`, `w-60`, rechterborder): **Alle notities**, **Labels**, **Mappen**, **Archief**, **Instellingen**; onderaan een **agenda-icon** (`Calendar`) als externe link `<a href="https://agenda.jellebol.nl">`.
  - Mobiel `BottomBar.tsx` (agenda-patroon, `sm:hidden`, `safe-area-bottom`): **Notities**, **Mappen**, **Archief**, **Agenda** (externe link).
  - `TopBar.tsx`: titel, ＋-knop (nieuwe note), profielavatar (ProfielMenu met Instellingen/Uitloggen).
  - Labels/Mappen/Instellingen/＋ openen voorlopig een `PlaceholderModal` ("komt in Fase X") in agenda-modalstijl; empty states voor Notities en Archief.
- [x] Weergave-switch via state (`'alle' | 'map' | 'archief'`) — geen aparte routes, conform agenda.
- [x] Checks: `npm run lint` ✅, `npm run build` ✅, dev-server rendert ✅ (incl. manifest, sw.js, iconen).
- [x] Commit + push naar GitHub (`jelle-05/notes`).
- [ ] **Handmatig (Vercel-dashboard, kan Claude niet doen):** repo importeren in Vercel, beide `NEXT_PUBLIC_SUPABASE_*` env-vars instellen, domein `notes.jellebol.nl` koppelen, eerste deploy testen.

### Resultaat
> App met login, lege notes-weergave, werkende sidebar (desktop) en bottom-tabs (mobiel), agenda-link, PWA-basis. Klaar voor Fase 2.

---

## Fase 2 - Datamodel en opslag

**Doel:** volledig datamodel in één keer neerzetten — inclusief kolommen voor archief, mappen en instellingen die pas in latere fases UI krijgen. De synclaag werkt met `select *` + hele-rij-upserts (agenda-patroon); kolommen later toevoegen is onnodig gedoe.

**Status: afgerond** (op de handmatige Supabase-stap na, zie taken).

**Vastgelegde keuzes tijdens implementatie:**
- Het uitvoerbare schema staat in **`supabase/schema.sql`** (idempotent; veilig opnieuw te draaien). De SQL hieronder blijft als documentatie.
- Labels via `label_ids text[]` op de note-rij — bevestigd boven een aparte koppeltabel (agenda-patroon, simpelste sync).
- **Geen DB-triggers** voor `gewijzigd_op`: timestamps zijn client-managed (agenda-patroon), DB-default `now()` geldt alleen voor nieuwe rijen.
- `LijstItem` bewust minimaal (`id`, `tekst`, `afgevinkt`); volgorde = arrayvolgorde. jsonb is schemaloos, dus latere velden (positie, timestamps) vergen geen migratie.
- Het map-type heet `NotitieMap` (niet `Map`) om botsing met de globale ES `Map` te voorkomen.
- Extra indexes: `(user_id, gearchiveerd)`, `(user_id, map_id)` en GIN op `label_ids`.
- De synclaag is **fail-open**: zolang de SQL nog niet gedraaid is, werkt de app gewoon door op localStorage (catch rond alle Supabase-calls).

### Ontwerpbeslissingen
- **Eén `notes`-tabel** met `type`-kolom (`'notitie' | 'lijst'`) — beide soorten delen vrijwel alle velden.
- **Checklist-items als `jsonb`-kolom** op de rij (geen aparte items-tabel): past bij de hele-rij-sync van de agenda, en afvinken wordt één optimistische update + één upsert.
- **`label_ids text[]`** op de note (agenda doet dit ook bij afspraken) — geen join-table; filteren gebeurt client-side.
- **Eigen `notes_labels`/`notes_mappen` tabellen** — agenda-labels niet hergebruiken, zodat agenda en notes elkaar niet vervuilen.
- **`notes_instellingen` in de database** (user_id PK) i.p.v. alleen localStorage, zodat een latere server-side cron de archief-drempel per gebruiker kan lezen. Wel localStorage-cache voor instant UI.

### SQL (uitvoeren in Supabase SQL editor)

```sql
-- notes
create table if not exists notes (
  id              text primary key,
  user_id         uuid references auth.users not null,
  type            text not null default 'notitie',     -- 'notitie' | 'lijst'
  titel           text not null default '',
  inhoud          text not null default '',            -- bij type 'notitie'
  items           jsonb not null default '[]'::jsonb,  -- bij type 'lijst'
  label_ids       text[] not null default '{}',
  map_id          text,                                -- null = geen map
  gearchiveerd    boolean not null default false,
  gearchiveerd_op timestamptz,
  aangemaakt_op   timestamptz not null default now(),
  gewijzigd_op    timestamptz not null default now()
);
alter table notes enable row level security;
create policy "eigen notes" on notes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists notes_user_idx on notes (user_id);

-- notes_labels (zelfde vorm als agenda-labels zodat LabelBeheer 1:1 werkt)
create table if not exists notes_labels (
  id                text primary key,
  user_id           uuid references auth.users not null,
  naam              text not null,
  kleur             text not null,
  achtergrond_kleur text,
  tekst_kleur       text
);
alter table notes_labels enable row level security;
create policy "eigen notes_labels" on notes_labels for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notes_mappen
create table if not exists notes_mappen (
  id            text primary key,
  user_id       uuid references auth.users not null,
  naam          text not null,
  kleur         text,
  aangemaakt_op timestamptz not null default now()
);
alter table notes_mappen enable row level security;
create policy "eigen notes_mappen" on notes_mappen for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notes_instellingen
create table if not exists notes_instellingen (
  user_id            uuid primary key references auth.users not null,
  auto_archief_aan   boolean not null default false,
  auto_archief_dagen integer not null default 30,
  gewijzigd_op       timestamptz not null default now()
);
alter table notes_instellingen enable row level security;
create policy "eigen notes_instellingen" on notes_instellingen for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Daarna: **Realtime aanzetten** voor `notes`, `notes_labels`, `notes_mappen` (Database → Replication). `notes_instellingen` heeft geen realtime nodig.

### TypeScript types (`app/types.ts`)

```typescript
export type NotitieType = 'notitie' | 'lijst'

export type LijstItem = {
  id: string
  tekst: string
  afgevinkt: boolean
}

export type Notitie = {
  id: string
  type: NotitieType
  titel: string
  inhoud: string          // bij type 'notitie'
  items: LijstItem[]      // bij type 'lijst'
  labelIds: string[]
  mapId?: string
  gearchiveerd: boolean
  gearchiveerdOp?: string // ISO
  aangemaaktOp: string    // ISO
  gewijzigdOp: string     // ISO
}

// Bewust identiek aan agenda's Label zodat LabelBeheer 1:1 herbruikbaar is.
export type Label = {
  id: string
  naam: string
  kleur: string
  achtergrondKleur?: string
  tekstKleur?: string
}

export type Map = {
  id: string
  naam: string
  kleur?: string
  aangemaaktOp: string
}

export type Instellingen = {
  autoArchiefAan: boolean
  autoArchiefDagen: number
}

export const STANDAARD_INSTELLINGEN: Instellingen = {
  autoArchiefAan: false,
  autoArchiefDagen: 30,
}

export type Weergave = 'alle' | 'map' | 'archief'
```

### Taken
- [x] SQL-schema geschreven: `supabase/schema.sql` (tabellen, RLS, indexes, checks).
- [ ] **Handmatig (Supabase-dashboard, kan Claude niet doen):** `supabase/schema.sql` uitvoeren in de SQL Editor + Realtime aanzetten voor `notes`, `notes_labels` en `notes_mappen` (Database → Replication).
- [x] `app/types.ts` geschreven (`Notitie`, `LijstItem`, `Label`, `NotitieMap`, `Instellingen`, `STANDAARD_INSTELLINGEN`).
- [x] `lib/opslag.ts`: localStorage cache (keys `notes_notities`, `notes_labels`, `notes_mappen`, `notes_instellingen`; merge-op-defaults voor instellingen; corrupte cache breekt de app niet).
- [x] `lib/supabaseOpslag.ts`: CRUD + camelCase↔snake_case converters per tabel + bulk-upload voor eerste login + instellingen-upsert.
- [x] `lib/helpers.ts`: factories `nieuweNotitie()`, `nieuwLijstItem()`, `metGewijzigdOp()`, `nuIso()` — houden Fase 3 dun.
- [x] Sync in `NotesApp` aangesloten: localStorage direct bij mount, stille achtergrond-sync, realtime-kanaal op de drie tabellen, eerste-login-initialisatie. Empty states tonen alvast gesyncte aantallen.
- [x] Checks: `npm run lint` ✅, `npm run build` ✅, dev-server rendert ✅.

### Resultaat
> Volledig datamodel met werkende offline-first sync; latere fases voegen alleen nog UI toe.

---

## Fase 3 - Notes, checklist-functionaliteit en kopiëren

**Doel:** de kern van de app — notes en lijstjes beheren, plus de kopieerfunctie.

**Status: afgerond** (handmatige klik-test op desktop + iPhone nog door Jelle).

**Vastgelegde keuzes tijdens implementatie:**
- **Auto-save** (iOS Notes-stijl, door Jelle gekozen): geen Opslaan-knop — elke wijziging wordt direct optimistisch opgeslagen (state + localStorage), met een **gedebouncede Supabase-upsert (600 ms, laatste wint)** zodat typen geen upsert per toetsaanslag geeft. Bij sluiten ("Klaar") wordt direct geflusht.
- **Twee-staps verwijderknop** (door Jelle gekozen): "Verwijder notitie" → "Zeker weten?" (reset na 3 s) → pas dan echt weg.
- Nieuwe note wordt direct gepersisteerd; een **volledig lege** note (geen titel/inhoud/items) wordt bij sluiten stil verwijderd (iOS Notes-gedrag).
- De detail-editor werkt op een **eigen draft** (alleen gereset bij een andere note-id), zodat een realtime-herlaad de open editor nooit overschrijft.
- ＋ opent eerst een keuzemodal **Notitie / Lijst** (`NieuwKeuze.tsx`); `NotitieDetail.tsx` is detailweergave en editor ineen (geen apart formulier — past bij auto-save).
- Grid sorteert op `gewijzigdOp` aflopend.

### Taken
- [x] `NotitieKaart.tsx`: kaart met titel, preview (inhoud `line-clamp-4` / eerste 3 checklist-items + "+n meer"), afvink-teller (2/5), type-icoon, datum ("Vandaag"/"Gisteren"/"5 jun"), zachte schaduw, afgeronde hoeken, focus-ring.
- [x] `NotitieGrid.tsx`: responsive grid (1 kolom mobiel → 4 op breed scherm).
- [x] `NieuwKeuze.tsx` + `NotitieDetail.tsx` (i.p.v. NotitieFormulier/ChecklistEditor — zie keuzes): bottom-sheet mobiel / gecentreerd desktop, titel-input, auto-groeiende textarea (notitie) of checklist-editor (lijst).
- [x] Checklist-items: toevoegen via vast "Nieuw item…"-veld (Enter voegt toe en houdt focus), tekst bewerken, verwijderen (X), afvinken (doorgestreept + blauwe check).
- [x] **Afvinken optimistisch**: checkbox togglet direct in lokale state + localStorage; remote volgt gedebounced. UI wacht nooit op netwerk of realtime-roundtrip.
- [x] Detailweergave bij klik op kaart, met kopieer- en verwijderacties. `gewijzigdOp` wordt bij elke wijziging bijgewerkt (via `metGewijzigdOp`).
- [x] Verwijderen met twee-staps bevestiging.
- [x] **Kopieerfunctie**: `lib/kopieer.ts` (`notitieAlsTekst` + `kopieerNaarKlembord` met Clipboard API → textarea/execCommand-fallback incl. `setSelectionRange` voor iOS) en `KopieerKnop.tsx` in de detail-header (2 s "Gekopieerd" ✓ / "Kopiëren mislukt" bij falen). Tekst wordt synchroon in de onClick opgebouwd (iOS user-gesture-eis). Formaat: titel + lege regel + inhoud, checklist-items als `[x] …` / `[ ] …` per regel; geen labels/metadata.
- [x] Empty state ("Nog geen notities" + ＋-hint); loading-state ("Laden…"); sync-fouten zijn fail-open (cache blijft zichtbaar, fout in console).
- [ ] **Handmatig (Jelle):** klik-test op desktop én mobiel — note + lijst maken, afvinken, kopiëren op iOS Safari controleren.
- [x] Checks: `npm run lint` ✅, `npm run build` ✅, dev-server rendert ✅.

### Resultaat
> Volledig werkende notes en boodschappenlijstjes met afvinken en kopiëren naar klembord.

---

## Fase 4 - Labels

**Doel:** labels met eigen kleuren, gekoppeld aan notes.

**Status: afgerond** (klik-test door Jelle na deploy).

**Vastgelegde keuzes tijdens implementatie:**
- `LabelBeheer.tsx` en `lib/kleuren.ts` vrijwel 1:1 uit de agenda overgenomen; twee aanpassingen: de preview toont een **pill** (zoals op de kaarten, i.p.v. een event-blok) en verwijderen heeft een **twee-staps bevestiging** (consistent met NotitieDetail; agenda verwijdert direct).
- Label verwijderen stript het id uit `labelIds` van alle notes **zonder `gewijzigdOp`-bump** — opruimen is geen inhoudelijke wijziging, dus de kaartvolgorde verspringt niet.
- Kaarten tonen **max 3 pills + "+n"**; kleuren via `eventKleuren()` (eigen achtergrond-/tekstkleur, of een lichte tint van de basiskleur als fallback).
- Koppelen in de detailweergave via een uitklapbare keuzelijst ("Label toevoegen"); togglen met includes-check voorkomt dubbele koppelingen. Loopt via het bestaande auto-save-pad.

### Taken
- [x] `LabelBeheer.tsx` + `lib/kleuren.ts` gekopieerd uit agenda en aangesloten op `notes_labels` (aanmaken, bewerken, verwijderen; 12 preset-kleuren + eigen achtergrond-/tekstkleur via color picker met alpha-slider; contrast-warning bij ratio < 3; empty state).
- [x] Labels koppelen in de detailweergave (`NotitieDetail`, sectie "Labels"): pills met ×, uitklapbare multi-select voor alle labels — een note kan meerdere labels hebben.
- [x] Label-pills (`LabelPill.tsx`) op `NotitieKaart` en in de detailweergave (achtergrond- + tekstkleur, afgeronde pill, truncate op lange namen).
- [x] Label verwijderen → id alleen uit `label_ids` van alle notes gefilterd (lokaal + bulk-upsert remote); notes zelf blijven onaangetast.
- [x] Edge cases: lange labelnamen (truncate `max-w-[140px]`), veel labels op één kaart (max 3 + "+n"), verwijderd-maar-nog-gerefereerd label wordt stil overgeslagen bij rendering.
- [x] Realtime: `notes_labels` stond al aan en NotesApp luisterde er al op — geen extra Supabase-instelling nodig.
- [x] Checks: `npm run lint` ✅, `npm run build` ✅, dev-server rendert ✅.

### Resultaat
> Onbeperkt eigen labels (bv. `Boodschappen`, groen/wit) op notes en lijstjes.

---

## Fase 5 - Filteren en zoeken

**Doel:** snel het juiste vinden.

**Status: afgerond** (klik-test door Jelle na deploy).

**Vastgelegde keuzes tijdens implementatie:**
- **Meerdere actieve labels met OR-logica**: een note wordt getoond zodra hij *minstens één* van de actieve labels heeft (snel filteren in een persoonlijke app; AND zou bij 2+ labels vrijwel altijd leeg zijn).
- **Twee filteringangen**: klik op een label-pill op een kaart, óf toggle in de filterbalk (`ZoekFilterBalk.tsx`) boven het grid. Beide togglen dezelfde state (includes-check → geen dubbele filters).
- De kaart (`NotitieKaart`) werd daarvoor een `div` met `role="button"` + Enter/Spatie-handler — de pills zijn nu zelf buttons en geneste buttons zijn invalid HTML.
- **Verwijderde labels breken niets**: lokaal verwijderen ruimt `actieveLabelIds` direct op; voor realtime-verwijderingen vanaf een ander apparaat negeert de filterlogica ids die niet meer in `labels` bestaan.
- **Mapfilter alleen technisch voorbereid**: `actieveMapId`-state + mapstap in de filterketen bestaan al, maar zonder UI — sidebar-klik/mappenbeheer komt in Fase 6.
- Alles is **afgeleide state**: één `useMemo` (`getoondeNotities`) bovenop `actieveNotities` — geen Supabase-queries per toetsaanslag, geen search-library; realtime/localStorage-updates werken automatisch door en de sortering (gewijzigdOp desc) blijft staan.
- Open vraag #16 bevestigd: gearchiveerde notes zitten **niet** in zoek/filter (zoeken binnen het archief komt eventueel in Fase 7).

### Taken
- [x] Filter op label: klik op een pill op een kaart óf toggle in de filterbalk → alleen notes met (minstens één van) die labels; werkt voor notities én lijsten.
- [x] Filter op map technisch voorbereid (`actieveMapId` + filterstap); UI/sidebar-klik volgt in Fase 6.
- [x] Archieffilter: standaardweergave toont **nooit** gearchiveerde notes (zoek/filter draait op `actieveNotities`); archiefweergave blijft apart (Fase 7).
- [x] Zoekveld (eigen balk boven het grid, desktop + mobiel): client-side zoeken op titel, inhoud én checklist-itemtekst, case-insensitive + getrimd, live in een `useMemo`.
- [x] Actieve filters duidelijk tonen: actieve pills in labelkleur met ✓ en ring, zoekterm in het veld met ×-wisknop, "Wis filters" voor alles tegelijk; los wissen door een pill opnieuw te tikken.
- [x] Empty state "Geen resultaten" + "Pas je zoekterm of filters aan" + Wis filters-knop; bestaande "Nog geen notities" blijft voor een lege app.
- [x] Filters + zoeken responsive en touch-friendly: pills horizontaal scrollbaar (`overflow-x-auto`, geen pagina-overflow), zoekveld py-2.5, filterbalk alleen zichtbaar als er notities zijn (labelrij alleen als er labels zijn).
- [x] Checks: `npm run lint` ✅, `npm run build` ✅, dev-server rendert ✅.
- [ ] **Handmatig (Jelle):** klik-test na deploy — zoeken, pill-klik op kaart, filterbalk, wissen, horizontaal scrollen van pills op mobiel.

### Resultaat
> Filteren op labels (OR) en live zoeken over titel/inhoud/items, met zichtbare en wisbare actieve filters; mapfilter technisch klaar voor Fase 6.

---

## Fase 6 - Mappen

**Doel:** notes organiseren in eigen mappen (één niveau diep).

**Status: afgerond** (klik-test door Jelle na deploy).

**Vastgelegde keuzes tijdens implementatie:**
- De volledige opslaglaag (lokaal + Supabase CRUD + realtime op `notes_mappen`) bestond al sinds Fase 2 — Fase 6 voegt alleen UI en filterstate toe.
- **Mapfilter = AND** met de rest: een note moet in de gekozen map zitten én aan zoekterm/labelfilter voldoen. Sentinel `GEEN_MAP_FILTER` (in `types.ts`) voor het filter "Geen map" (notities zonder map).
- Een map heeft bewust **alleen een naam** (de `kleur`-kolom blijft ongebruikt) en geen `gewijzigd_op` — hernoemen is een hele-rij-upsert, conform schema. Dubbele namen zijn — net als bij labels — toegestaan.
- **Verwijderen verplaatst nooit notes de prullenbak in**: alle notes met die `mapId` (ook gearchiveerde) gaan naar "Geen map", zonder `gewijzigdOp`-bump (kaartvolgorde blijft staan, zelfde keuze als bij label-verwijderen). Labelkoppelingen blijven onaangetast.
- **Verwijderde map breekt geen filterstate**: lokaal verwijderen reset het actieve mapfilter naar "Alle notities"; een realtime-verwijdering vanaf een ander apparaat wordt render-time genegeerd (mapfilter op een onbekend id doet niets).
- Navigatiekeuze: "Alle notities"/Notities-tab wist het mapfilter; mapkeuze zet altijd weergave 'alle'. De TopBar toont de mapnaam als titel bij een actief mapfilter.

### Taken
- [x] `MapBeheer.tsx`: modal voor mappen aanmaken, hernoemen (trim, lege naam geblokkeerd via disabled Bewaar), verwijderen — LabelBeheer-patroon (lijst ↔ bewerk), met aantal notities per map in de lijst.
- [x] Mappenlijst in de desktop-sidebar (sectie "Mappen", klik = filter, incl. "Geen map") + ＋-knop voor beheer; scrollbaar bij veel mappen, nav-items uit Fase 1 blijven werken.
- [x] Mobiel: `MapKiezer.tsx` bottom-sheet vanaf de Mappen-tab (Alle notities / Geen map / mappen, ✓ bij actief) + knop "Mappen beheren"; Mappen-tab licht op bij actief mapfilter.
- [x] Map kiezen in `NotitieDetail` (uitklapbare keuzelijst boven Labels, optie "Geen map", ✓ bij huidige) — loopt via het bestaande auto-save-pad, alleen `mapId` wijzigt.
- [x] **Veilige verwijderflow**: uitlegtekst met aantal notities ("blijven bestaan en verhuizen naar Geen map") + twee-staps bevestiging → `mapId` eraf lokaal + bulk-upsert remote.
- [x] Actief mapfilter zichtbaar (sidebar-highlight, TopBar-titel, blauwe chip in de filterbalk met ×) en wisbaar (chip-×, "Wis filters", Alle notities).
- [x] Empty states: "Deze map is leeg" / "Geen losse notities" (alleen mapfilter), bestaande "Geen resultaten" bij combinatie met zoek/labels, "Nog geen mappen…" in beheer/kiezer.
- [x] Checks: `npm run lint` ✅, `npm run build` ✅, dev-server rendert ✅.
- [ ] **Handmatig (Jelle):** klik-test na deploy — map aanmaken/hernoemen/verwijderen, note verplaatsen, filteren (incl. combinatie met zoeken/labels), mobiele sheet.

### Resultaat
> Mappen aanmaken en notes erin organiseren, zonder dataverlies bij verwijderen; filteren op map werkt samen met zoeken en labels.

---

## Fase 7 - Archief

**Doel:** handmatig archiveren en terugzetten.

**Status: afgerond** (klik-test door Jelle na deploy).

**Vastgelegde keuzes tijdens implementatie:**
- **Geen swipe-actie** op kaarten: swipe past niet bij het grid/desktop-patroon. Archiveren zit in de detailweergave (bewerk-modus, boven de verwijderknop); terugzetten kan direct op de archiefkaart én in de detailweergave.
- **Geen bevestiging** bij archiveren/terugzetten — de actie is omkeerbaar (anders dan verwijderen).
- **Beide overgangen bumpen `gewijzigdOp`** (via `metGewijzigdOp`): teruggezette notes komen voorspelbaar bovenaan het actieve grid en worden niet direct opnieuw auto-gearchiveerd door Fase 8.
- **Directe remote upsert** (geen 600ms-debounce): archiveren is een discrete actie, geen typestroom; een lopende debounce-timer voor die note wordt eerst geannuleerd.
- Archief sorteert op `gearchiveerdOp` desc (nieuwst gearchiveerd eerst, fallback `gewijzigdOp`); de kaartdatum toont de archiveerdatum.
- **Geen zoek/filterbalk in het archief** (vraag #16): kan later alsnog als dat nodig blijkt.

### Taken
- [x] Archiveer-actie in de detailweergave (bewerk-modus achter het potlood): "Archiveer notitie/lijst" → `gearchiveerd = true`, `gearchiveerdOp = now`; modal sluit daarna.
- [x] Archiefweergave via sidebar-item / bottom-tab: alleen gearchiveerde notes in het bestaande grid, visueel gedempt (`opacity-70`, vol bij hover).
- [x] "Terugzetten"-actie op de archiefkaart (footer-knop met ArchiveRestore-icoon) én in de detailweergave → `gearchiveerd = false`, `gearchiveerdOp = undefined`.
- [x] Archiefstatus correct in alle filters/zoeken: actieve weergave draait op `actieveNotities` (sluit gearchiveerd al uit sinds Fase 3); archiefweergave alléén gearchiveerde.
- [x] Empty state voor leeg archief ("Archief is leeg" — Fase 7-tellertekst vervangen).
- [x] Checks: `npm run lint` ✅, `npm run build` ✅, dev-server rendert ✅.
- [ ] **Handmatig (Jelle):** klik-test na deploy — archiveren uit detail, terugzetten via kaart en detail, gedempte stijl, mobiel.

### Resultaat
> Volwaardig archief: opruimen zonder weggooien; terugzetten met één klik.

---

## Fase 8 - Instellingen en automatisch archiveren

**Doel:** instellingenpagina + automatische archivering.

**Status: afgerond** (klik-test door Jelle na deploy).

**Vastgelegde keuzes tijdens implementatie:**
- **Alleen dagen** als periode-instelling (1–3650, default 30) — geen aparte eenheid-keuze (dagen/weken/maanden): het datamodel uit Fase 2 heeft alleen `auto_archief_dagen` en dat dekt het doel. Validatie: lege/ongeldige invoer valt terug op de huidige waarde; buiten bereik wordt geclampt met een korte rode hint.
- **Direct opslaan, geen Bewaar-knop**: elke wijziging gaat optimistisch naar state + localStorage en fail-open naar Supabase (`onConflict: user_id`-upsert → nooit dubbele records; agenda-patroon met console.error bij netwerkfouten).
- **Client-side bij app-start, ná de eerste Supabase-sync** (`syncKlaar`-state, gezet in `.finally()` van beide sync-paden): voorkomt archiveren op stale cache en dus hele-rij-upserts over nieuwere remote edits heen. Guard-ref → maximaal één run per sessie; reset wanneer de toggle uit→aan gaat (direct hercontroleren) en bij uitloggen.
- Zelfde statusovergang als handmatig archiveren (Fase 7), als bulk: `gearchiveerd = true`, `gearchiveerdOp = nu`, `gewijzigdOp`-bump; stil (geen meldingen), fouten alleen in de console.
- **Idempotent**: gearchiveerde notes zijn nooit kandidaat; teruggezette notes hebben een verse `gewijzigdOp` (Fase 7-bump) en blijven dus buiten de drempel. Onparseerbare datums worden overgeslagen (nooit per ongeluk archiveren); fallback voor leeftijd is `aangemaaktOp`.
- **Geen realtime nodig voor `notes_instellingen`**: instellingen laden bij start; een wijziging op een ander apparaat komt mee bij de volgende start. Geen extra Supabase-instelling vereist.
- `PlaceholderModal.tsx` verwijderd — alle placeholders zijn nu vervangen door echte functionaliteit.

### Taken
- [x] `InstellingenMenu.tsx` (modal in app-stijl, via sidebar én ProfielMenu) met sectie **Archief**: toggle "Automatisch archiveren" (standaard uit), periode-instelling in dagen (standaard 30), uitlegtekst + statusregel.
- [x] Opslag: `notes_instellingen` (Supabase) + localStorage-cache; laden bij mount met defaults-merge (bestond al sinds Fase 2, nu aangesloten op de UI).
- [x] `lib/archief.ts`: `vindAutoArchiefKandidaten(notities, instellingen)` (pure functie, testbaar) + `clampArchiefDagen`; uitvoering in NotesApp één keer na de eerste sync — zelfde pad als handmatig archiveren.
- [x] **Waarom `gewijzigdOp` en niet aanmaakdatum**: archiveren gaat over inactiviteit — een lijst die je nog afvinkt blijft "levend" (afvinken ververst `gewijzigdOp`).
- [x] Cron-variant (server-side, draait ook als de app dicht is) blijft bewust **optioneel, fase 10+** — zie daar. Fase 8 blokkeert dus niet op Vercel-cron-config.
- [x] Checks: `npm run lint` ✅, `npm run build` ✅, dev-server rendert ✅.
- [ ] **Handmatig (Jelle):** klik-test na deploy — instellingen openen (sidebar + profielmenu), toggle/periode wijzigen, refresh (waarde blijft), en met een korte periode controleren dat oude notes naar het archief gaan.

### Resultaat
> Instelbare automatische archivering die bij elke app-start netjes opruimt.

---

## Fase 9 - Polish, responsive en UX

**Doel:** alles strak, iOS-waardig en zonder regressies.

**Status: afgerond** (klik-test op echte apparaten door Jelle na deploy).

**Vastgelegde keuzes tijdens implementatie:**
- **Favicon/app-icon**: `public/icon.svg` is de ene bron voor álle iconen. `metadata.icons` in `app/layout.tsx` zet de browser-tab-favicon (SVG + PNG-fallback, geen `.ico` nodig) én de apple-touch-icon; het manifest gebruikte dezelfde assets al → favicon = beginscherm-icoon. `scripts/generate-icons.mjs` genereert nu ook `public/apple-touch-icon.png` (180×180, full-bleed `#FFCC00` — iOS rondt zelf af en ondersteunt geen transparante hoeken).
- **Keyboard**: Escape sluit alle modals (mini-hook `lib/useEscape.ts`); kaarten waren al Enter/Spatie-bedienbaar.
- **Focus**: globale `:focus-visible`-outline (blauw, 2px offset) op alle interactieve elementen in `globals.css` — alleen zichtbaar bij toetsenbordnavigatie.
- **Reduced motion**: `prefers-reduced-motion: reduce` schakelt transities/animaties praktisch uit (globale regel).
- **Safe-area**: utility `.modal-safe-bottom` (`1rem + env(safe-area-inset-bottom)`) op de body van alle bottom-sheets — content komt op iPhone niet meer onder de home-indicator.
- **Dialogen**: `role="dialog"` + `aria-modal` + `aria-label` op alle modals.

### Taken
- [x] iOS-stijl nagelopen: kaarten zonder schaduw (eerdere polish-ronde), afgeronde hoeken, rustige kleuren en spacing consistent over alle weergaven.
- [x] Hover/focus/active states: globale focus-visible-ring; bestaande hover/active states gecontroleerd en consistent bevonden.
- [x] Touch-targets: TopBar-＋ en potlood-knop (detail) vergroot; sluitkruisjes (NieuwKeuze/ProfielMenu) groter tapvlak via padding/negatieve marge; checklist-knoppen waren al ruim.
- [x] Empty/loading/error states nagelopen — overal aanwezig en consistent (EmptyState-component, "Geen resultaten", "Deze map is leeg", "Archief is leeg", laadscherm, kopieer-foutstate, validatiehints).
- [x] Safe-area op iOS: `.modal-safe-bottom` op alle sheet-bodies; BottomBar had al `safe-area-bottom`; NieuwKeuze houdt zijn eigen calc.
- [x] Kopieerknop geverifieerd: tekst synchroon in de klikactie (iOS-eis), Clipboard API + execCommand-fallback en feedback-states intact — geen regressie door de bewerk-modus. Echte test op iOS Safari/PWA door Jelle.
- [x] Modals/sheets/filters op kleine schermen gecheckt (max-h + overflow-y-auto, horizontaal scrollende pills zonder pagina-overflow, truncates op lange titels/labels/mapnamen; TopBar-titel `min-w-0`).
- [x] Toegankelijkheid: aria-labels op alle icon-only knoppen, `role="dialog"`/`aria-modal`, Escape-sluiten, focus-visible, `prefers-reduced-motion`.
- [x] **Favicon/app-icon** ingesteld en geverifieerd (icon-links in de head, alle assets 200 in dev).
- [x] Checks: `npm run lint` ✅, `npm run build` ✅, dev-server rendert ✅.
- [ ] **Handmatig (Jelle):** favicon in de browser-tab na deploy, add-to-homescreen op iPhone (zelfde gele logo), safe-area onderin sheets op iPhone, kopiëren op iOS Safari/PWA.

### Resultaat
> Een afgewerkte app die aanvoelt als de agenda-app, met een eigen herkenbaar app-icoon.

---

## Fase 10 - Testen, build, documentatie en oplevering

**Doel:** productie-klaar en gedocumenteerd.

### Taken
- [ ] `npm run lint` en `npm run build` draaien en fixen (geen testsuite — agenda heeft die ook niet; handmatige test-checklist per feature doorlopen).
- [ ] Resterende bugs oplossen.
- [ ] `README.md` schrijven: features, stack, lokaal draaien, env-vars (alleen namen, **geen secrets/keys**).
- [ ] `CLAUDE.md` schrijven: stack, mappenstructuur, conventies, werkwijze (agenda-CLAUDE.md als voorbeeld).
- [ ] Eventueel `ideas.md` starten met toekomstideeën (zie open vragen: pinnen, prullenbak, drag-and-drop, import/export, reminders...).
- [ ] Kort documenteren hoe de kopieerfunctie werkt (formaat, fallback, iOS-aandachtspunten).
- [ ] Per fase/PR beschrijven welke bestanden zijn aangepast en waarom.
- [ ] **Optioneel — cron-auto-archief**: `app/api/cron/auto-archief/route.ts` naar agenda-patroon (`X-Cron-Secret`, service-role client, leest `notes_instellingen` per gebruiker) + Vercel cron. Alleen nodig als archiveren óók moet gebeuren wanneer de app lang niet geopend wordt.
- [ ] Eind-deploy controleren op `notes.jellebol.nl`.

### Resultaat
> Live, gedocumenteerde, productie-klare Notes-app.

---

## Beoogde bestandsstructuur

```
app/
  page.tsx                      — rendert <NotesApp/>
  layout.tsx                    — root layout (agenda-patroon)
  globals.css                   — safe-area, font, kleuren
  manifest.ts                   — PWA "Notities"
  privacy/page.tsx              — statisch (optioneel, agenda-patroon)
  types.ts                      — Notitie, LijstItem, Label, Map, Instellingen, Weergave
  components/
    NotesApp.tsx                — hoofdcomponent: auth, sync, realtime, state, modals
    Sidebar.tsx                 — desktop-navigatie (incl. agenda-link)
    BottomBar.tsx               — mobiele tabs
    TopBar.tsx                  — titel, zoeken, ＋, profiel
    NotitieGrid.tsx / NotitieKaart.tsx
    NotitieFormulier.tsx / ChecklistEditor.tsx
    KopieerKnop.tsx
    LabelBeheer.tsx / LabelFilter.tsx       — uit agenda
    MapBeheer.tsx
    InstellingenMenu.tsx / ProfielMenu.tsx  — agenda-patroon
    LoginPagina.tsx / SwRegistratie.tsx / ErrorBoundary.tsx — uit agenda
  lib/
    supabase.ts                 — uit agenda
    opslag.ts                   — localStorage cache
    supabaseOpslag.ts           — CRUD + converters
    kopieer.ts                  — plain-text + clipboard fallback
    kleuren.ts                  — uit agenda
    archief.ts                  — pasAutoArchiefToe()
  api/
    cron/auto-archief/route.ts  — optioneel, fase 10+
public/                         — sw.js, iconen, offline.html
```

---

## Open vragen

Vragen waar al een antwoord/aanname voor is (uit analyse en gemaakte keuzes):

| # | Vraag | Antwoord / aanname |
|---|---|---|
| 1 | Apart project of monorepo met agenda? | **Apart project** in `D:\jelle\notes`, eigen repo en Vercel-project. Wel zelfde Supabase-backend. |
| 2 | Eigen domein `notes.jellebol.nl`? | **Ja.** |
| 3 | Notes per gebruiker of persoonlijk? | **Per gebruiker** (`user_id` + RLS, agenda-patroon). |
| 4 | Login/auth nodig? | **Ja** — Supabase Auth, bestaand agenda-account werkt (zelfde project). |
| 5 | Offline werken? | **Ja** — offline-first via localStorage cache (agenda-patroon). |
| 6 | Realtime sync tussen apparaten? | **Ja** — Supabase Realtime op notes/labels/mappen. |
| 7 | Labels globaal of per gebruiker? | **Per gebruiker**, en gescheiden van agenda-labels (eigen `notes_labels`-tabel). |
| 8 | Mappen genest of één niveau? | **Eén niveau diep** (start); nesten kan later via `parent_id`-kolom. |
| 9 | Meerdere labels per note? | **Ja** — `label_ids text[]`. |
| 15 | Auto-archief op aanmaak- of wijzigingsdatum? | **Wijzigingsdatum** (`gewijzigd_op`) — inactiviteit is de juiste maat; afvinken telt als wijziging. |
| 17 | Kleuren vrij of presets? | **Vrij via color picker** (agenda's LabelBeheer: presets + eigen kleuren + contrast-warning). |
| 20 | Exact als agenda of zelfde stijlrichting? | **Zelfde stijlrichting** (kleuren, modals, spacing, iOS-gevoel); layout verschilt (sidebar + kaartengrid i.p.v. kalender). |
| 21 | Kopieert de knop alleen inhoud of ook titel? | **Titel + inhoud** (titel, lege regel, inhoud); lege delen weggelaten. |
| 22 | Labels/mapnaam meekopiëren? | **Nee** — puur de content, geen metadata. |
| 23 | Weergave afgevinkte items in gekopieerde tekst? | **`[x]` afgevinkt / `[ ]` open**, elk item op een eigen regel. |

Nog open (beslissen tijdens of na de eerste fases; niets hiervan blokkeert de planning):

| # | Vraag | Voorstel |
|---|---|---|
| 10 | Checklist-items drag-and-drop sorteren? | Niet in v1; itemvolgorde = arrayvolgorde, dus later toevoegbaar zonder migratie. → ideas.md |
| 11 | Notes handmatig sorteren? | v1 sorteert op `gewijzigd_op` (nieuwste eerst). Handmatig sorteren → ideas.md. |
| 12 | Pin/favoriet support? | Niet in v1; eenvoudig later (`gepind boolean`). → ideas.md |
| 13 | Full-text search? | v1: client-side zoeken (fase 5) is voldoende bij persoonlijk gebruik. Postgres FTS alleen als het ooit traag wordt. |
| 14 | Prullenbak of direct verwijderen? | v1: direct verwijderen mét bevestiging; archief vangt het "spijt"-scenario deels op. Prullenbak → ideas.md. |
| 16 | Gearchiveerde notes in zoekresultaten? | **Bevestigd in fase 5/7:** niet in de standaardzoek; het archief heeft (nog) geen eigen zoekbalk — kan later als dat nodig blijkt. |
| 18 | Import/export? | Niet in v1. → ideas.md (export als tekst/JSON zou simpel zijn). |
| 19 | Reminders/notificaties? | Niet in v1. Agenda heeft de hele infra (push/Telegram/e-mail) al — herbruikbaar als dit ooit gewenst is. → ideas.md |
| 24 | Alleen geselecteerde checklist-items kopiëren? | Niet in v1; de hele lijst kopiëren dekt het boodschappen-scenario. → ideas.md |

---

## Werkwijze

1. Werk fase voor fase; sluit een fase af (incl. test op desktop + mobiel) vóór de volgende begint.
2. Commit na elke werkende feature — Vercel deployt automatisch.
3. Draai `npm run lint` en `npm run build` minimaal aan het eind van elke fase.
4. Geen secrets/keys in documentatie of commits; env-vars alleen bij naam noemen.
5. Houd de agenda-app als referentie open: bij twijfel over stijl of patroon, doe wat de agenda doet.
