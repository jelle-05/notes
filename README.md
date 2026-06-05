# 📝 Notities

Persoonlijke notes-app voor notities en afvinkbare lijstjes, met labels, mappen en archief. Zusterproject van de [agenda-app](https://agenda.jellebol.nl) en gebouwd op dezelfde stack en stijl (iOS-geïnspireerd, licht thema, Nederlands).

> Status: **Fase 1 afgerond** — projectbasis en navigatie-shell. Zie [fases.md](fases.md) voor het volledige bouwplan.

## Tech stack

```
Frontend:     Next.js 16 (App Router, Turbopack) + TypeScript
Styling:      Tailwind CSS v4
Icons:        Lucide React
Backend:      Supabase (PostgreSQL + Auth + Realtime) — gedeeld project met de agenda-app
Hosting:      Vercel (notes.jellebol.nl)
PWA:          manifest + service worker (offline fallback)
```

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

## Scripts

| Script | Doel |
|---|---|
| `npm run dev` | Dev-server op localhost:3000 |
| `npm run build` | Productie-build |
| `npm run start` | Productie-server |
| `npm run lint` | ESLint |
| `node scripts/generate-icons.mjs` | PWA-iconen (PNG) opnieuw genereren vanuit `public/icon.svg` |

## Structuur

```
app/
  components/   — React components ('use client')
  lib/          — helpers (Supabase client; Fase 2: opslag/sync)
  types.ts      — gedeelde types
  page.tsx      — rendert <NotesApp/>
public/         — sw.js, offline.html, iconen
fases.md        — gefaseerd bouwplan + open vragen
```
