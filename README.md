# 📝 Notities

Persoonlijke notes-app voor notities en afvinkbare lijstjes, met labels, mappen en archief. Zusterproject van de [agenda-app](https://agenda.jellebol.nl) en gebouwd op dezelfde stack en stijl (iOS-geïnspireerd, licht thema, Nederlands).

> Status: **Fase 9 afgerond** — polish, toegankelijkheid en app-icoon. Zie [fases.md](fases.md) voor het volledige bouwplan. **TWA Fase 1 (PWA-readiness) afgerond** — zie [twa.md](twa.md) en de sectie [PWA & Android TWA](#pwa--android-twa) hieronder.

## Features

- 📝 **Notities** — vrije tekst met titel, auto-save (geen opslaan-knop)
- ✅ **Lijstjes** — afvinkbare items (boodschappen!), items toevoegen met Enter
- 📋 **Kopiëren als tekst** — geopende note → "Kopieer": titel + inhoud als platte tekst; checklists als `[x] item` / `[ ] item` per regel. Werkt ook op iOS (Clipboard API met fallback)
- 🏷️ **Labels** — onbeperkt eigen labels met achtergrond- en tekstkleur (color picker + contrast-warning), koppelbaar aan meerdere notes; pills op de kaarten
- 🔍 **Zoeken & filteren** — live zoeken op titel, inhoud en checklist-items; filteren op labels via pill-klik of filterbalk (meerdere labels = OR), actieve filters zichtbaar en wisbaar
- 📁 **Mappen** — platte mappen om notities te organiseren; filteren per map (combineert met zoeken/labels), veilige verwijderflow: notities blijven bestaan en verhuizen naar "Geen map"
- 🗄️ **Archief** — archiveren vanuit de detailweergave, terugzetten met één klik (op de kaart of in detail); gedempte archiefweergave, nieuwst gearchiveerd bovenaan
- ⚙️ **Automatisch archiveren** — optioneel (standaard uit): notities die langer dan een instelbare periode (standaard 30 dagen) niet zijn gewijzigd, gaan bij het openen van de app automatisch naar het archief
- 🔄 **Offline-first + realtime** — direct uit localStorage, stille sync met Supabase, live updates tussen apparaten
- 🗑️ Verwijderen met twee-staps bevestiging; volledig lege notes worden automatisch opgeruimd

## Tech stack

```
Frontend:     Next.js 16 (App Router, Turbopack) + TypeScript
Styling:      Tailwind CSS v4
Icons:        Lucide React
Backend:      Supabase (PostgreSQL + Auth + Realtime) — gedeeld project met de agenda-app
Hosting:      Vercel (notes.jellebol.nl)
PWA:          manifest + service worker (offline fallback)
```

## PWA & Android TWA

De app is PWA-ready: manifest (`app/manifest.ts`, incl. maskable icon en `lang`/`dir`), service worker met offline-fallback (`public/sw.js` + `public/offline.html`) en consistente theme-color. Het plan om de app als Android-app (Trusted Web Activity, privé-APK via Bubblewrap) te draaien staat in [twa.md](twa.md) — **TWA Fase 1 (readiness-check) is afgerond**; Fase 2+ (push, wrapper) wacht op de open vragen in twa.md §12.

Zelf checken:

- Chrome DevTools → **Application → Manifest**: geen warnings, "Installable" (op de live URL of `npm run dev`).
- Offline-fallback: DevTools → Network → Offline → navigeren toont `offline.html`.
- Na een wijziging aan `public/icon.svg`: `node scripts/generate-icons.mjs` draaien (genereert de PNG-iconen opnieuw).

## Lokaal draaien

```bash
npm install
npm run dev
```

Maak een `.env.local` met (waarden uit het Supabase-dashboard, of overnemen uit het agenda-project):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Inloggen werkt met een bestaand agenda-account (zelfde Supabase-project).

### Database-setup (eenmalig)

1. Open het Supabase-dashboard → **SQL Editor** en voer [`supabase/schema.sql`](supabase/schema.sql) uit (idempotent, veilig opnieuw te draaien).
2. Zet **Realtime** aan voor de tabellen `notes`, `notes_labels` en `notes_mappen` via Database → Replication.

Zonder deze stap blijft de app gewoon werken (offline-first via localStorage), maar wordt er niets gesynchroniseerd tussen apparaten.

## Scripts

| Script | Doel |
|---|---|
| `npm run dev` | Dev-server op localhost:3000 |
| `npm run build` | Productie-build |
| `npm run start` | Productie-server |
| `npm run lint` | ESLint |
| `node scripts/generate-icons.mjs` | App-iconen (192/512/maskable/apple-touch PNG) opnieuw genereren vanuit `public/icon.svg` — dezelfde bron als de favicon |

## Structuur

```
app/
  components/   — React components ('use client')
  lib/          — helpers (Supabase client; Fase 2: opslag/sync)
  types.ts      — gedeelde types
  page.tsx      — rendert <NotesApp/>
public/         — sw.js, offline.html, iconen
fases.md        — gefaseerd bouwplan + open vragen
twa.md          — plan voor Android TWA (privé-APK) + pushmeldingen
```
