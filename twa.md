# TWA-plan Notes-app

Plan om de bestaande Notes-webapp (`notes.jellebol.nl`) om te bouwen naar een **Trusted Web Activity (TWA)** voor Android — een privé-APK voor eigen gebruik, **niet** voor publicatie in de Play Store. Dit document is het hoofdplan; er is nog niets van gebouwd.

> ⚠️ **Geen secrets in Git.** Nergens in dit plan (of in latere commits) horen VAPID private keys, keystore-bestanden, keystore-wachtwoorden of andere geheime waarden. Env-vars worden alleen bij **naam** genoemd.

---

## 1. Doel

De Notes-app moet als Android-app op het eigen toestel kunnen draaien:

- De bestaande, live webapp opent in een native Android-shell (TWA) — fullscreen, zonder browser-balk.
- De APK wordt lokaal gebouwd en **gesideload** op het eigen toestel; geen Play Store, geen review, geen publicatie.
- De app gebruikt het bestaande Notes-logo als app-icoon.
- Pushmelding-support wordt **voorbereid** (permission-flow, subscription, testknop in de instellingen-tab); echte notificatieflows (reminders, app-events) komen pas later.

Omdat een TWA letterlijk de live website toont, zijn webapp-updates direct beschikbaar in de app — de APK hoeft alleen opnieuw gebouwd te worden bij wijzigingen aan de native wrapper zelf.

## 2. Huidige status van de app

Wat er al staat (na Fase 0–9):

| Onderdeel | Status |
|---|---|
| Next.js | 16 (App Router, Turbopack), TypeScript strict, Tailwind v4 |
| Manifest | ✅ `app/manifest.ts` → `/manifest.webmanifest`: naam "Notities", `display: standalone`, `orientation: portrait`, `start_url: '/'`, `lang: nl`, `dir: ltr`, `theme/background: #ffffff`, icons svg/192/512/maskable |
| Icons | ✅ `public/icon.svg` is de ene bron; `scripts/generate-icons.mjs` genereert `icon-192/512.png`, `icon-maskable.png` (full-bleed `#FFCC00`) en `apple-touch-icon.png`; favicon via `metadata.icons` in `app/layout.tsx` |
| Service worker | ✅ `public/sw.js` (`notes-v2`): cache-first voor `/_next/static/`, offline-fallback (`offline.html`), `push`- en `notificationclick`-handlers |
| Instellingen-tab | ✅ `app/components/InstellingenMenu.tsx` (modal via sidebar + profielmenu), nu één sectie **Archief** — uitbreidbaar met een sectie **Pushmeldingen** |
| Deployment | ✅ Vercel, auto-deploy op push naar `main`; domein **`https://notes.jellebol.nl`** (HTTPS — vereist voor TWA en push) |
| Auth/backend | ✅ Supabase (gedeeld project met agenda): Auth, PostgreSQL met RLS, Realtime; offline-first localStorage-sync |
| API-routes | ✅ `app/api/push/subscribe` (POST/DELETE) + `app/api/push/test` (POST), Bearer-token-auth, beperkt tot `PUSH_TOEGESTAAN_EMAIL` |
| `assetlinks.json` | ✅ `public/.well-known/assetlinks.json` — package `nl.jellebol.notes` + SHA-256-fingerprint van de keystore |
| Push-infra | ✅ VAPID-keys gegenereerd (lokaal in `.env.local`; nog naar Vercel), `notes_push_subscriptions` in `supabase/schema.sql` (nog uitvoeren in SQL Editor), sectie Pushmeldingen in InstellingenMenu |

**Referentie:** de agenda-app (`D:\jelle\agenda`, niet wijzigen) heeft een complete, werkende web-push-stack die vrijwel 1:1 te kopiëren is: `app/lib/pushUtils.ts` (subscribe/afmelden incl. VAPID-key-rotatiecheck), `app/api/push/subscribe` + `app/api/push/test` (Bearer-token auth, `web-push`, dode subscriptions opruimen bij 404/410), de `push_subscriptions`-tabel en sw.js-handlers voor `push`/`notificationclick`. Ook het InstellingenMenu-patroon met permission-status en testknop bestaat daar al.

## 3. Gewenste eindstatus

- ✅ Een **APK voor eigen gebruik**, lokaal gebouwd en gesideload — geen Play Store.
- ✅ De TWA opent **`https://notes.jellebol.nl`** fullscreen/standalone (geen adresbalk dankzij kloppende Digital Asset Links).
- ✅ App-icoon = het bestaande gele Notes-logo (zelfde bron als favicon/PWA-icons).
- ✅ Pushmelding-support **voorbereid**: service worker kan meldingen tonen, subscriptions worden per gebruiker opgeslagen, en er is een veilige test-route.
- ✅ Instellingen-tab heeft een sectie **Pushmeldingen** met statusregels en de knoppen **Pushmeldingen inschakelen** en **Test pushmelding**.
- ⏭️ Echte notificaties (reminders/app-events/scheduler) zijn bewust **latere fase** (TWA Fase 5).

## 4. Technische keuzes

| Keuze | Besluit / voorstel |
|---|---|
| TWA-generator | **Bubblewrap CLI** (`@bubblewrap/cli`) — leest het bestaande webmanifest en genereert het Android-project; geen Android Studio nodig (`bubblewrap doctor` regelt JDK/SDK-checks). Gradle-build zit erin. |
| Package name | Voorstel: **`nl.jellebol.notes`** (open vraag #2). |
| Signing | Eigen **keystore** (Bubblewrap maakt die aan bij init). De keystore + wachtwoorden zijn geheim: **nooit committen**, bewaren in wachtwoordmanager + offline backup (open vraag #10). Bij elke update moet **dezelfde** key gebruikt worden, anders weigert Android de update. |
| Digital Asset Links | `assetlinks.json` met de SHA-256-fingerprint van de signing key (de fingerprint zelf is publiek — geen secret) gehost op **`https://notes.jellebol.nl/.well-known/assetlinks.json`** → in dit project: `public/.well-known/assetlinks.json` (Vercel serveert `public/` op de root). Kloppen package name + fingerprint niet exact, dan toont Chrome een blijvende URL-balk. |
| Manifest/SW | Bestaand `app/manifest.ts` + `public/sw.js` hergebruiken; sw.js uitbreiden met push-handlers (agenda-patroon, incl. cache-versie-bump). |
| Push | **Web Push API + Notification API met VAPID** — agenda-patroon kopiëren: `web-push` (npm) server-side, `urlBase64ToUint8Array`/subscribe-helpers client-side. In een TWA toont Chrome de meldingen namens de app (notification delegation); de permission-flow loopt via de browser-engine. |
| Subscription-opslag | Eigen Supabase-tabel **`notes_push_subscriptions`** (zelfde kolomvorm als agenda's `push_subscriptions`: `user_id`, `endpoint`, `p256dh`, `auth`; RLS `auth.uid() = user_id`). **Bewust een eigen tabel**, gescheiden van de agenda: anders zouden agenda-reminders ook naar Notes-subscriptions pushen en vice versa. |
| Test-push backend | Next.js **API-routes** in dít project (agenda-patroon): `app/api/push/subscribe/route.ts` (POST/DELETE) en `app/api/push/test/route.ts` (POST), `runtime = 'nodejs'`, auth via Supabase Bearer-token. Geen aparte serverfunctie nodig. |
| Env-vars | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (publiek, mag in de client), `VAPID_PRIVATE_KEY` (server-only, **alleen** in Vercel env + `.env.local`, gitignored), `VAPID_SUBJECT` (mailto-adres). Genereren met `npx web-push generate-vapid-keys` — **pas in TWA Fase 2, en de private key nooit in Git of docs**. Eigen keys voor Notes (niet die van de agenda hergebruiken: eigen subscriptions-tabel → eigen keypair houdt rotatie onafhankelijk). |
| Vercel | Geen speciale config: `.well-known` werkt via `public/`; API-routes draaien als serverless functions; env-vars via het dashboard (Production + Preview). |

## 5. Benodigde webapp-aanpassingen

Aanpassingen in `D:\jelle\notes` (volgorde ≈ TWA Fase 1 + 2):

1. **Manifest controleren/aanvullen** (`app/manifest.ts`) — grotendeels klaar. Checken: `display: standalone` (genoeg voor TWA; `fullscreen` alleen indien gewenst, open vraag #9), `orientation`, `theme_color`. Eventueel `dir`/`lang` toevoegen.
2. **Icons** — klaar (Fase 9). De maskable-icon is voor Android het belangrijkst; Bubblewrap gebruikt de manifest-icons.
3. **Theme/background color** — `#ffffff` consistent in manifest + viewport; bepaalt de Android-statusbalk en splash-achtergrond.
4. **`public/.well-known/assetlinks.json`** — nieuw bestand (TWA Fase 3, want het heeft de keystore-fingerprint nodig). Publiek, mág in Git.
5. **Service worker uitbreiden** (`public/sw.js`): `push`-handler (toon notificatie met `icon-192.png`, titel/bericht uit JSON-payload) + `notificationclick`-handler (focus of open `/`), cache-naam bumpen naar `notes-v2`. Agenda-sw als voorbeeld.
6. **Push-helpers** (`app/lib/pushUtils.ts`, kopie agenda): `subscribeerOpPush(accessToken)` (incl. VAPID-key-rotatiecheck en herstel van kapotte registraties) en `afmeldenVanPush(accessToken)`.
7. **Permission-helper**: statusbepaling zoals agenda's `bepaalPushStatus()` — `'laden' | 'niet-ondersteund' | 'geblokkeerd' | 'uit' | 'aan'` op basis van `Notification.permission` + actieve subscription.
8. **API-routes**: `app/api/push/subscribe/route.ts` (subscription upsert/verwijderen, user-scoped) en `app/api/push/test/route.ts` (zie §6). Dependency `web-push` toevoegen.
9. **Supabase**: tabel `notes_push_subscriptions` + RLS toevoegen aan `supabase/schema.sql` (idempotent; Jelle voert uit in de SQL Editor). Geen realtime nodig.
10. **Instellingen-tab uitbreiden** (`InstellingenMenu.tsx`): nieuwe sectie **Pushmeldingen** onder Archief (zie §6 voor de exacte inhoud).
11. **Documentatie**: README (env-var-namen, geen waarden), CLAUDE.md (push-sectie), dit document bijwerken per afgeronde TWA-fase.

## 6. Pushmeldingen-plan

### Nu voorbereiden (TWA Fase 2)

**Permission-flow** (agenda-patroon):
1. Bij openen van de instellingen: status bepalen — ondersteunt de browser het (`'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window`)? Wat is `Notification.permission`? Is er een actieve subscription?
2. Knop "Pushmeldingen inschakelen" → `Notification.requestPermission()` (alleen vanuit status 'uit', zodat een geblokkeerde gebruiker geen zinloze prompt krijgt) → bij `granted`: subscriben.

**Subscription aanmaken**: `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <NEXT_PUBLIC_VAPID_PUBLIC_KEY> })`; bij een gewisselde VAPID-key wordt de oude subscription eerst opgezegd (rotatiecheck uit agenda's `pushUtils`).

**Opslag**: POST naar `/api/push/subscribe` met Bearer-token → upsert in `notes_push_subscriptions` (`user_id`, `endpoint`, `p256dh`, `auth`). Eén rij per apparaat/endpoint; uitzetten = DELETE op endpoint (opt-out per apparaat).

**Test pushmelding versturen**: knop → POST `/api/push/test` (Bearer-token). De route haalt alle subscriptions van de ingelogde user op en stuurt via `web-push` een payload `{ titel: 'Testmelding', bericht: 'Pushmeldingen werken op dit apparaat', id: 'test-<timestamp>' }`. De sw toont hem. **Veilig testen**: de route werkt alleen met een geldig token en pusht alleen naar subscriptions van je eigen `user_id` (RLS + expliciete `eq('user_id', ...)`) — er kan dus nooit naar iemand anders gepusht worden, en de private key blijft server-side.

**Foutafhandeling** (agenda-patroon):
- 404/410 van een push-endpoint → subscription permanent verlopen → rij opruimen, melding in respons (`{ verstuurd, opgeruimd }`).
- Transient errors (netwerk/5xx) → subscription behouden, fout loggen zonder endpoint in de log.
- Geen subscriptions → nette 404 met uitleg ("Zet meldingen aan in de app.").
- Client toont succes-/foutfeedback in de sectie (zie hieronder), nooit een crash.

**Permission geweigerd** → status "geblokkeerd": de inschakelen-knop verdwijnt, er komt een uitlegregel ("Meldingen zijn geblokkeerd — zet ze weer aan via de site-instellingen van je browser/Android-appinfo"). De app werkt verder gewoon door; push is een optionele laag.

**Geen push-support** (bv. oude browser, iOS zonder PWA-installatie) → statusregel "Niet ondersteund op dit apparaat", geen knoppen. Geen foutmeldingen.

**Instellingen-tab, sectie `Pushmeldingen`** (onder de Archief-sectie, zelfde stijl):

| Element | Gedrag |
|---|---|
| Statusregel | "Ondersteund" / "Niet ondersteund op dit apparaat" |
| Permission-status | "Toegestaan" / "Geblokkeerd" / "Nog niet gevraagd" (afgeleid van `Notification.permission`) |
| Knop **Pushmeldingen inschakelen** | Alleen bij status 'uit'; vraagt permission + subscribet; wordt "Pushmeldingen uitschakelen" bij status 'aan' |
| Knop **Test pushmelding** | Alleen bij status 'aan'; POST `/api/push/test`; disabled tijdens verzenden |
| Feedback | "Testmelding verstuurd ✓" (2 s, zoals KopieerKnop) |
| Foutmelding | Rustige rode tekstregel, bv. "Versturen mislukt — probeer het later opnieuw" of de API-uitleg |

### Later bouwen (TWA Fase 5)

- Automatische pushes vanuit app-events (bv. "lijst gedeeld", "note automatisch gearchiveerd").
- Reminders per note (datum/tijd kiezen → melding).
- Scheduler: Vercel-cron naar agenda-patroon (`X-Cron-Secret`-header + service-role client) die periodiek due reminders verstuurt — de agenda heeft hiervoor al een compleet voorbeeld (`app/api/cron/reminders`).
- Terugkerende notificaties en productieklare flows (retry, quiet hours, per-categorie aan/uit).

## 7. TWA/APK stappenplan

1. **Webapp PWA-ready maken** — manifest/icons/sw checken (grotendeels klaar, zie §5 punt 1–3); installability verifiëren met Chrome DevTools → Application → Manifest ("Installable").
2. **Live deployment URL vastleggen**: `https://notes.jellebol.nl` (open vraag #1 bevestigen).
3. **Bubblewrap installeren**: `npm i -g @bubblewrap/cli`, daarna `bubblewrap doctor` (installeert/checkt JDK + Android SDK).
4. **TWA-project initialiseren**: `bubblewrap init --manifest https://notes.jellebol.nl/manifest.webmanifest` — in een **aparte map buiten deze repo** (bv. `D:\jelle\notes-twa`), zodat Android-buildbestanden en keystore nooit in deze Git terechtkomen.
5. **Package name kiezen**: voorstel `nl.jellebol.notes` (open vraag #2).
6. **App-icoon instellen**: Bubblewrap pakt de manifest-icons (512 + maskable) automatisch; controleren in de gegenereerde resources.
7. **Keystore maken**: Bubblewrap genereert er een bij init (of `keytool`). Wachtwoorden in de wachtwoordmanager; bestand + backup buiten Git (open vraag #10).
8. **`assetlinks.json` genereren**: `bubblewrap fingerprint` (of `keytool -list -v`) → SHA-256-fingerprint → assetlinks-JSON met `delegate_permission/common.handle_all_urls`, de package name en de fingerprint.
9. **Hosten** op `https://notes.jellebol.nl/.well-known/assetlinks.json` → bestand in `public/.well-known/assetlinks.json` in dít project, committen en deployen; daarna verifiëren dat de URL live 200 geeft met `Content-Type: application/json`.
10. **APK bouwen**: `bubblewrap build` → gesigneerde `app-release-signed.apk`.
11. **Lokaal installeren**: APK naar het toestel (USB/`adb install` of bestandsoverdracht) en installeren — Android vraagt eenmalig om "onbekende bronnen" toe te staan.
12. **Testen** volgens §9.
13. **Updates**: webapp-wijzigingen zijn direct live (geen APK-rebuild). Alleen bij wrapper-wijzigingen (icoon, naam, kleuren, Android-instellingen): `bubblewrap update && bubblewrap build` met **dezelfde keystore**, en opnieuw sideloaden.

## 8. Private distributie

- De APK gaat **niet** naar de Play Store; installatie is handmatig (sideload) op het eigen toestel.
- Android toont bij sideloaden een waarschuwing ("onbekende app installeren") — eenmalig toestaan voor de gebruikte bron (bv. Files/Chrome).
- Zonder Play Store ook **geen automatische updates** van de wrapper — maar omdat de TWA de live site toont, is dat vrijwel nooit nodig.
- **Signing key goed bewaren**: zelfde key vereist voor elke toekomstige build; kwijt = app verwijderen en opnieuw installeren (lokale data staat in localStorage van Chrome en Supabase, dus geen echt dataverlies, maar vermijdbaar gedoe).
- **Nooit committen**: keystore (`*.keystore`/`*.jks`), wachtwoorden, `VAPID_PRIVATE_KEY`. Het TWA-project leeft in een eigen map buiten deze repo; mocht er ooit iets van in de repo komen, eerst `.gitignore` aanvullen.
- Later eventueel delen via eigen opslag (bv. privé-drive) kan, maar is nu niet nodig.

## 9. Testplan

| # | Test | Verwacht |
|---|---|---|
| 1 | PWA-manifest (DevTools → Application) | Geen warnings, "Installable" |
| 2 | Icons | Tab-favicon, add-to-homescreen en TWA-launcher tonen hetzelfde gele Notes-logo; maskable oogt goed in ronde maskers |
| 3 | Installability | Chrome op Android biedt "App installeren" aan op de live URL |
| 4 | TWA-start | App opent fullscreen/standalone, **zonder** Chrome URL-balk (assetlinks OK) |
| 5 | Login/auth | Supabase-login werkt in de TWA; sessie blijft bewaard na herstart (TWA deelt Chrome-profielstorage) |
| 6 | Offline-first | Vliegtuigmodus: app toont gecachte notes; offline.html bij koude start zonder netwerk |
| 7 | Realtime sync | Wijziging op desktop verschijnt live in de TWA |
| 8 | Instellingen-tab | Archief-sectie werkt; Pushmeldingen-sectie toont juiste status |
| 9 | Push permission-flow | "Inschakelen" → Android-permissieprompt → status "Toegestaan", subscription-rij in Supabase |
| 10 | Test pushmelding | Knop → melding verschijnt met Notes-icoon; tik opent/focust de app |
| 11 | Geweigerde permission | Status "Geblokkeerd" + uitleg; geen crashes, geen herhaalprompt |
| 12 | Geen push-support | Statusregel "Niet ondersteund"; knoppen verborgen |
| 13 | App na webapp-update | Nieuwe deploy direct zichtbaar in de TWA zonder APK-rebuild |
| 14 | Android back-button | Gedrag van de history-stack-fix (NotesApp back-gesture-effect) controleren in TWA-context; modals sluiten via eigen knoppen |
| 15 | Safe-area/statusbalk | Witte statusbalk, content niet onder statusbalk/home-indicator (safe-area CSS) |
| 16 | Light theme/contrast | Wit thema correct; iconen leesbaar in launcher (geel logo op licht/donker masker) |

## 10. Risico's en aandachtspunten

- **Push in TWA** vereist een correcte service worker + notification delegation; meldingen lopen via Chrome — als Chrome-meldingen op Android uitgeschakeld zijn, komt er niets binnen (check in Android-instellingen).
- **iOS is anders**: Web Push op iOS werkt alleen vanaf een geïnstalleerde PWA (16.4+) en valt buiten dit TWA-plan; de Notes-app blijft op iPhone gewoon als PWA/website werken.
- **`VAPID_PRIVATE_KEY` mag nooit client-side** of in Git — alleen Vercel env + lokale `.env.local` (gitignored).
- **Signing**: sideloaded APK moet correct gesigneerd zijn; updates vereisen exact dezelfde key.
- **Digital Asset Links moeten exact kloppen** (package name + SHA-256 + live bereikbaar op `/.well-known/assetlinks.json`), anders blijft de Chrome-balk zichtbaar.
- **HTTPS verplicht** — al geregeld via Vercel.
- **Auth/sessies in TWA testen**: TWA gebruikt de Chrome-storage van het toestel; Supabase-localStorage-sessies horen gewoon te werken, maar test login → herstart → nog ingelogd.
- **Webapp-updates zijn direct live**; de APK is alleen een dunne wrapper. Geen Play Store = geen automatische wrapper-updates (acceptabel voor privégebruik).
- **Gedeeld Supabase-project met de agenda**: eigen `notes_push_subscriptions`-tabel en eigen VAPID-keypair voorkomen dat agenda- en notes-pushes elkaar kruisen.

## 11. Faseplanning

### TWA Fase 1 — PWA readiness ✅ afgerond

Readiness-check uitgevoerd; bevindingen:

- **Manifest** compleet voor TWA: `name/short_name: 'Notities'`, `id/start_url/scope: '/'`, `display: standalone`, `orientation: portrait`, theme/background `#ffffff`, icons svg + 192 + 512 + maskable. `lang: 'nl'` en `dir: 'ltr'` toegevoegd (enige code-wijziging in deze fase).
- **Icons** OK: alle manifest-paden verwijzen naar bestaande bestanden in `public/`; de maskable (full-bleed `#FFCC00`, content 410/512 px) blijft binnen de Android-veiligheidszone. Favicon en apple-touch-icon via `metadata.icons` kloppen.
- **Service worker + offline** OK: `notes-v1`, precache `offline.html`, cache-first voor `/_next/static/`, network-first navigatie met offline-fallback, oude caches opgeruimd bij activate. Push/notificationclick-handlers kunnen in Fase 2 als extra listeners erbij (incl. cache-bump naar `notes-v2`) zonder de offline-functionaliteit te raken.
- **Layout/metadata** consistent: `lang="nl"` op `<html>`, `viewport.themeColor` = manifest-`theme_color` (`#ffffff`), `viewportFit: 'cover'` voor safe-areas.
- **HTTPS/domein** OK: Vercel op `https://notes.jellebol.nl`.
- **`next.config.ts` is leeg** — prima; Vercel serveert `public/.well-known/assetlinks.json` straks gewoon als JSON. Bij Fase 3 live verifiëren (200 + `Content-Type: application/json`); alleen bij problemen een `headers()`-regel toevoegen.
- ⏳ **Handmatige check** (Jelle): Chrome DevTools → Application → Manifest moet "Installable" tonen zonder warnings (live URL of `npm run dev`).

### TWA Fase 2 — Push basis ✅ code afgerond

Gebouwd naar agenda-patroon:

- `web-push` + `@types/web-push` als dependency; VAPID-keypair gegenereerd in `.env.local` (eigen keys, niet die van de agenda).
- `public/sw.js`: cache-bump naar `notes-v2` + `push`-handler (toont `titel`/`bericht` met `icon-192.png`) en `notificationclick`-handler (focus of open `/`).
- `app/lib/pushUtils.ts`: `subscribeerOpPush()` (incl. VAPID-rotatiecheck en herstel van kapotte registraties) + `afmeldenVanPush()`.
- `app/api/push/subscribe/route.ts` (POST upsert / DELETE per endpoint) en `app/api/push/test/route.ts` (testpush naar alle eigen apparaten, 404/410-opruiming, `{ verstuurd, opgeruimd }`). Afwijking van agenda: VAPID-config is **lazy** (nette 503 i.p.v. crash als env-vars ontbreken) en push is beperkt tot het account in `PUSH_TOEGESTAAN_EMAIL` (open vraag #6).
- `supabase/schema.sql`: tabel `notes_push_subscriptions` + RLS (idempotent).
- `InstellingenMenu.tsx`: sectie **Pushmeldingen** (status, toestemming, in-/uitschakelen, **Test pushmelding** met 2 s-feedback, foutregel, uitleg bij geblokkeerd).

**Nog te doen door Jelle (config, geen code):**
1. `supabase/schema.sql` opnieuw uitvoeren in de Supabase SQL Editor (idempotent — voegt alleen `notes_push_subscriptions` toe).
2. In Vercel (Production + Preview) de env-vars zetten: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_TOEGESTAAN_EMAIL` — waarden staan lokaal in `.env.local` (de private key nooit elders delen).
3. Testen: instellingen → Pushmeldingen inschakelen → Test pushmelding (eerst lokaal/desktop-Chrome, daarna op de S26 in Chrome).

### TWA Fase 3 — TWA wrapper ✅ afgerond

- Bubblewrap CLI geïnstalleerd; `bubblewrap doctor` groen (JDK 17 + Android SDK via `~/.bubblewrap`).
- Project geïnitialiseerd in **`D:\jelle\notes-twa`** (buiten deze repo): package `nl.jellebol.notes`, naam "Notities", `standalone`/portrait, witte theme, `enableNotifications: true`, icons 512 + maskable van de live site.
- Keystore `android.keystore` (alias `android`) in de projectmap; wachtwoord in de wachtwoordmanager. **Let op (geleerd tijdens de build):** gebruik voor keystore-wachtwoorden alleen letters/cijfers — Bubblewrap geeft het wachtwoord op Windows via de command line door aan apksigner, en speciale tekens worden door cmd verminkt (eerste keystore moest daardoor opnieuw, en het wachtwoord lekte in een foutmelding).
- `bubblewrap build` → `app-release-signed.apk` (+ `.aab`, voor ons niet nodig).
- `assetlinks.json` (package + SHA-256-fingerprint, publiek) staat in `public/.well-known/` en wordt door Vercel op de root geserveerd.

### TWA Fase 4 — APK build en privé-installatie
`bubblewrap build`, sideloaden op het eigen toestel, volledig testplan (§9) doorlopen, bevindingen hier bijwerken.

### TWA Fase 5 — Later: echte notificaties
Reminders per note, app-event-pushes, Vercel-cron-scheduler (agenda-patroon), terugkerende meldingen. Pas plannen na Fase 1–4.

## 12. Open vragen — ✅ beantwoord (juni 2026)

1. **Definitieve URL** — ✅ `https://notes.jellebol.nl` is definitief.
2. **Package name** — ✅ `nl.jellebol.notes` akkoord.
3. **Logo** — ✅ het gele notitie-icoon (`public/icon.svg`) is definitief.
4. **App-naam op het toestel** — ✅ blijft "Notities".
5. **Subscriptions in Supabase** — ✅ eigen tabel `notes_push_subscriptions` akkoord.
6. **Alleen eigen gebruiker** — ✅ push is beperkt tot één account: de API-routes
   weigeren (403) elk account dat niet overeenkomt met de server-only env-var
   `PUSH_TOEGESTAAN_EMAIL` (naast de RLS-scoping per user).
7. **Testtoestel** — ✅ Samsung Galaxy S26 (Android 13+ runtime-notificatiepermissie van toepassing).
8. **Reminders later** — ✅ echte reminders komen op een andere dag (Fase 5); nu alleen de testpush.
9. **Weergave** — ✅ `standalone` (zelfde instelling als de agenda-app; al zo in het manifest).
10. **Keystore-bewaarplek** — ✅ wachtwoordmanager.

---

*Status: TWA Fase 1 ✅, Fase 2 ✅ (testpush werkt op desktop én S26) en Fase 3 ✅ (wrapper gebouwd, assetlinks gehost). Volgende stap: Fase 4 — `app-release-signed.apk` sideloaden op de S26 en het testplan (§9) doorlopen.*
