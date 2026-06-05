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
- [ ] SQL-schema aanmaken in Supabase + RLS controleren + Realtime aanzetten.
- [ ] `app/types.ts` schrijven.
- [ ] `lib/opslag.ts`: localStorage cache (laad/sla op voor notes, labels, mappen, instellingen; merge-op-defaults voor instellingen zoals agenda's `laadFilters`).
- [ ] `lib/supabaseOpslag.ts`: CRUD + camelCase↔snake_case converters per tabel (agenda-patroon `rijNaarAfspraak`/`afspraakNaarRij`).
- [ ] Sync in `NotesApp` aansluiten: laden bij mount, achtergrond-sync, realtime-herlaad.

### Resultaat
> Volledig datamodel met werkende offline-first sync; latere fases voegen alleen nog UI toe.

---

## Fase 3 - Notes, checklist-functionaliteit en kopiëren

**Doel:** de kern van de app — notes en lijstjes beheren, plus de kopieerfunctie.

### Taken
- [ ] `NotitieKaart.tsx`: kaart met titel, preview (eerste regels inhoud / eerste checklist-items), label-pills (fase 4), zachte schaduw, afgeronde hoeken.
- [ ] `NotitieGrid.tsx`: responsive grid van kaarten (1 kolom mobiel, 2-3+ desktop).
- [ ] `NotitieFormulier.tsx`: modal (agenda-patroon: bottom-sheet mobiel / gecentreerd desktop) voor aanmaken/bewerken; type-keuze **Notitie** of **Lijst** bij aanmaken.
- [ ] `ChecklistEditor.tsx`: items toevoegen (Enter = volgende item), bewerken, verwijderen, afvinken.
- [ ] **Afvinken optimistisch** (acceptatiecriterium): checkbox togglet direct in lokale state, daarna localStorage + achtergrond-upsert. UI wacht nooit op netwerk of realtime-roundtrip.
- [ ] Note-detailweergave bij klik op een kaart (zelfde modal of detail-sheet) met bewerk-, verwijder- en kopieeracties. `gewijzigdOp` bijwerken bij elke save (ook bij afvinken).
- [ ] Verwijderen met bevestiging.
- [ ] **Kopieerfunctie**:
  - `lib/kopieer.ts` met `notitieAlsTekst(n: Notitie): string` en `kopieerNaarKlembord(tekst): Promise<boolean>`.
  - Formaat notitie: `titel` + lege regel + `inhoud`; lege delen worden weggelaten. Puur plain text, geen markdown/HTML/metadata, geen labels of mapnaam.
  - Formaat checklist: titel + lege regel, daarna per item één regel: `[x] tekst` (afgevinkt) of `[ ] tekst`.
  - Klembord: eerst `navigator.clipboard.writeText` (vereist secure context); bij falen fallback via verborgen `<textarea>` + `document.execCommand('copy')` (met `setSelectionRange` voor iOS Safari).
  - **iOS-eis**: de tekst-string synchroon in de onClick opbouwen — geen async werk vóór de clipboard-write, anders weigert Safari de actie buiten de user-gesture.
  - `KopieerKnop.tsx`: kopieer-icon in de detailweergave; bij succes 2 seconden "Gekopieerd" + check-icon, daarna terug naar idle; bij falen korte foutmelding ("Kopiëren mislukt").
- [ ] Empty state ("Nog geen notities" + ＋-hint), loading- en error-states.
- [ ] Testen op desktop én mobiel (incl. kopiëren op iOS Safari).

### Resultaat
> Volledig werkende notes en boodschappenlijstjes met afvinken en kopiëren naar klembord.

---

## Fase 4 - Labels

**Doel:** labels met eigen kleuren, gekoppeld aan notes.

### Taken
- [ ] `LabelBeheer.tsx` + `lib/kleuren.ts` kopiëren uit agenda en aansluiten op `notes_labels` (aanmaken, bewerken, verwijderen; naam + kleur + optioneel eigen achtergrond-/tekstkleur via color picker; contrast-warning bij slechte combinatie).
- [ ] Labels koppelen in `NotitieFormulier` (multi-select; een note kan meerdere labels hebben).
- [ ] Label-pills op `NotitieKaart` en in de detailweergave (achtergrondkleur + tekstkleur van het label, afgeronde pill).
- [ ] Label verwijderen → id alleen uit `label_ids` van alle notes filteren; notes zelf blijven onaangetast.
- [ ] Edge cases: lange labelnamen (truncate), veel labels op één kaart (wrap of "+2"), verwijderd-maar-nog-gerefereerd label negeren bij rendering.

### Resultaat
> Onbeperkt eigen labels (bv. `Boodschappen`, groen/wit) op notes en lijstjes.

---

## Fase 5 - Filteren en zoeken

**Doel:** snel het juiste vinden.

### Taken
- [ ] Filter op label: klik op een pill of via filtermenu → alleen notes met dat label.
- [ ] Filter op map (sidebar-klik zet `weergave='map'` + `actieveMapId`).
- [ ] Archieffilter: standaardweergave toont **nooit** gearchiveerde notes; archiefweergave alléén gearchiveerde.
- [ ] Zoekveld (TopBar desktop, eigen balk mobiel): client-side zoeken op titel, inhoud én checklist-itemtekst, in een `useMemo` (agenda-patroon voor afgeleide data).
- [ ] Actieve filters duidelijk tonen (chips met ×-knop om te wissen).
- [ ] Filters + zoeken responsive en touch-friendly.

### Resultaat
> Filteren op label/map/archief en zoeken, met zichtbare actieve filters.

---

## Fase 6 - Mappen

**Doel:** notes organiseren in eigen mappen (één niveau diep).

### Taken
- [ ] `MapBeheer.tsx`: modal voor mappen aanmaken, hernoemen, verwijderen.
- [ ] Mappenlijst in de desktop-sidebar (sectie "Mappen", klik = filter) + "＋ Nieuwe map".
- [ ] Mobiel: mappen via bottom-sheet vanaf de Mappen-tab.
- [ ] Map kiezen in `NotitieFormulier` (dropdown/sheet, optie "Geen map").
- [ ] **Veilige verwijderflow**: bevestigingsdialoog "Map verwijderen? De notities blijven bestaan en verhuizen naar Geen map." → `map_id = null` op betreffende notes.
- [ ] Lege-map empty state.

### Resultaat
> Mappen aanmaken en notes erin organiseren, zonder dataverlies bij verwijderen.

---

## Fase 7 - Archief

**Doel:** handmatig archiveren en terugzetten.

### Taken
- [ ] Archiveer-actie op kaart (swipe/menu) en in de detailweergave → `gearchiveerd = true`, `gearchiveerdOp = now`.
- [ ] Archiefweergave via sidebar-item / bottom-tab: alleen gearchiveerde notes, visueel herkenbaar (bv. gedempte kaarten).
- [ ] "Terugzetten"-actie in archiefweergave → `gearchiveerd = false`, `gearchiveerdOp = null`.
- [ ] Archiefstatus correct in alle filters/zoeken (gearchiveerd nooit tussen actief, tenzij expliciet in archiefweergave).
- [ ] Empty state voor leeg archief.

### Resultaat
> Volwaardig archief: opruimen zonder weggooien.

---

## Fase 8 - Instellingen en automatisch archiveren

**Doel:** instellingenpagina + automatische archivering.

### Taken
- [ ] `InstellingenMenu.tsx` (agenda-patroon, via sidebar/ProfielMenu) met sectie **Archief**:
  - Toggle "Automatisch archiveren" (standaard uit).
  - Periode-instelling: aantal + eenheid (dagen/weken/maanden), **standaard 1 maand (30 dagen)**.
  - Uitlegtekst: *"Notities die langer dan de ingestelde periode niet zijn gewijzigd, worden automatisch naar het archief verplaatst."*
- [ ] Opslag: `notes_instellingen` (Supabase) + localStorage-cache; laden bij mount met defaults-merge.
- [ ] `lib/archief.ts`: `pasAutoArchiefToe(notities, instellingen)` — draait één keer na het laden van data bij app-start; archiveert niet-gearchiveerde notes waarvan `gewijzigdOp` ouder is dan de drempel (optimistische update + upsert, zelfde pad als handmatig archiveren).
- [ ] **Waarom `gewijzigdOp` en niet aanmaakdatum**: archiveren gaat over inactiviteit — een lijst die je nog afvinkt blijft "levend" (afvinken ververst `gewijzigdOp`).
- [ ] Cron-variant (server-side, draait ook als de app dicht is) is bewust **optioneel, fase 10+** — zie daar. Fase 8 blokkeert dus niet op Vercel-cron-config.

### Resultaat
> Instelbare automatische archivering die bij elke app-start netjes opruimt.

---

## Fase 9 - Polish, responsive en UX

**Doel:** alles strak, iOS-waardig en zonder regressies.

### Taken
- [ ] iOS-stijl verfijnen: zachte kaarten, afgeronde hoeken, subtiele schaduwen, rustige kleuren, consistente spacing.
- [ ] Hover/focus/active states op alle interactieve elementen; zichtbare focus-ring voor toetsenbord.
- [ ] Touch-targets ≥ 44px op mobiel; checkboxes prettig aantikbaar.
- [ ] Alle empty/loading/error states nalopen.
- [ ] Safe-area gedrag op iOS (notch/home-indicator) controleren.
- [ ] Kopieerknop + feedback-states verifiëren op desktop, Android Chrome en iOS Safari (incl. PWA standalone).
- [ ] Modals/sheets/forms/filters op kleine schermen checken; geen kapotte sidebar op mobiel.
- [ ] Toegankelijkheid: aria-labels op icon-knoppen, contrast, `prefers-reduced-motion`.
- [ ] Geen layout-regressies tussen weergaven.

### Resultaat
> Een afgewerkte app die aanvoelt als de agenda-app.

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
| 16 | Gearchiveerde notes in zoekresultaten? | Voorstel: niet in de standaardzoek; wel zoeken bínnen de archiefweergave. Bevestigen bij fase 5/7. |
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
