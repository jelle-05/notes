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
    NotesApp.tsx       — hoofdcomponent: auth, state, weergave-switch, modals
    Sidebar.tsx        — desktop-navigatie (incl. externe agenda-link)
    BottomBar.tsx      — mobiele tabs
    TopBar.tsx         — titel + nieuw + profiel
    PlaceholderModal.tsx — tijdelijk, voor features uit latere fases
    LoginPagina / ProfielMenu / ErrorBoundary / SwRegistratie
  lib/supabase.ts      — Supabase client
  types.ts             — gedeelde types (Weergave; Fase 2 voegt datatypes toe)
scripts/generate-icons.mjs — PWA-iconen genereren vanuit public/icon.svg
```

## Werkwijze

- Werk fase voor fase volgens `fases.md`; vink taken daar af.
- `npm run lint` + `npm run build` moeten groen zijn vóór commit; commit per werkende feature (Vercel deployt automatisch op push naar `main`).
- Geen secrets in code/docs. Env-vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local`, gitignored).

## Status

- ✅ Fase 0 — analyse agenda-app (zie fases.md)
- ✅ Fase 1 — projectbasis + navigatie-shell + auth-skelet
- ⏭️ Fase 2 — datamodel (SQL in fases.md) + opslag/sync-laag
