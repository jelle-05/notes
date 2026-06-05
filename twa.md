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
| Manifest | ✅ `app/manifest.ts` → `/manifest.webmanifest`: naam "Notities", `display: standalone`, `start_url: '/'`, `theme/background: #ffffff`, icons 192/512/maskable |
| Icons | ✅ `public/icon.svg` is de ene bron; `scripts/generate-icons.mjs` genereert `icon-192/512.png`, `icon-maskable.png` (full-bleed `#FFCC00`) en `apple-touch-icon.png`; favicon via `metadata.icons` in `app/layout.tsx` |
| Service worker | ✅ `public/sw.js`: cache-first voor `/_next/static/`, offline-fallback (`offline.html`). ❌ **Geen** `push`/`notificationclick`-handlers |
| Instellingen-tab | ✅ `app/components/InstellingenMenu.tsx` (modal via sidebar + profielmenu), nu één sectie **Archief** — uitbreidbaar met een sectie **Pushmeldingen** |
| Deployment | ✅ Vercel, auto-deploy op push naar `main`; domein **`https://notes.jellebol.nl`** (HTTPS — vereist voor TWA en push) |
| Auth/backend | ✅ Supabase (gedeeld project met agenda): Auth, PostgreSQL met RLS, Realtime; offline-first localStorage-sync |
| API-routes | ❌ Nog geen `app/api/` in dit project (de agenda heeft ze wél, incl. push — zie §4) |
| `assetlinks.json` | ❌ Geen `public/.well-known/` |
| Push-infra | ❌ Geen VAPID-keys, geen subscriptions-tabel, geen push-API |

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

### TWA Fase 1 — PWA readiness
Manifest/icons/sw verifiëren (vrijwel klaar na Fase 9), installability-check in Chrome, eventuele manifest-finetuning (`orientation`, `lang`). *Klein — vooral controle.*

### TWA Fase 2 — Push basis
VAPID-keys genereren (env-vars in Vercel + `.env.local`), `notes_push_subscriptions`-tabel + RLS in `supabase/schema.sql`, `web-push`-dependency, sw.js push/notificationclick-handlers, `lib/pushUtils.ts`, API-routes `/api/push/subscribe` + `/api/push/test`, en de sectie **Pushmeldingen** met **Test pushmelding**-knop in `InstellingenMenu.tsx`. Alles naar agenda-patroon.

### TWA Fase 3 — TWA wrapper
Bubblewrap installeren, project init in een map buiten deze repo, package name, keystore aanmaken + veilig opbergen, `assetlinks.json` genereren en hosten via `public/.well-known/`.

### TWA Fase 4 — APK build en privé-installatie
`bubblewrap build`, sideloaden op het eigen toestel, volledig testplan (§9) doorlopen, bevindingen hier bijwerken.

### TWA Fase 5 — Later: echte notificaties
Reminders per note, app-event-pushes, Vercel-cron-scheduler (agenda-patroon), terugkerende meldingen. Pas plannen na Fase 1–4.

## 12. Open vragen

1. **Definitieve URL** — is `https://notes.jellebol.nl` definitief gekoppeld en blijft dat zo? (TWA + assetlinks zijn domeingebonden.)
2. **Package name** — akkoord met `nl.jellebol.notes`?
3. **Logo** — is het huidige gele notitie-icoon (`public/icon.svg`) definitief, of komt er nog een redesign vóór de APK-build?
4. **App-naam op het toestel** — "Notities" (zoals het manifest) of iets anders ("Notes")?
5. **Subscriptions in Supabase** — akkoord met een eigen `notes_push_subscriptions`-tabel in het gedeelde project?
6. **Alleen eigen gebruiker?** — pushes zijn per `user_id`; moeten we ergens afdwingen dat alléén jouw account kan subscriben, of is RLS per user genoeg (ook als iemand anders ooit zou inloggen)?
7. **Testtoestel** — welke Android-versie/welk toestel gebruik je? (Relevant voor de Android 13+ runtime-notificatiepermissie.)
8. **Reminders later** — wil je in TWA Fase 5 echte reminders, of blijft het bij handmatige testpush?
9. **Weergave** — standalone mét statusbalk (huidige manifest-instelling, aanbevolen) of echt fullscreen?
10. **Keystore-bewaarplek** — wachtwoordmanager + welke backup-locatie?

---

*Status: plan opgesteld, nog niets gebouwd. Volgende stap: open vragen beantwoorden → TWA Fase 1 (PWA readiness-check).*
