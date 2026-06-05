-- ════════════════════════════════════════════════════════════════════════════
-- Notes-app — databaseschema (Fase 2)
--
-- Uitvoeren: Supabase dashboard → SQL Editor → plak dit bestand → Run.
-- Het script is idempotent (if not exists / drop policy if exists) en kan
-- veilig opnieuw gedraaid worden.
--
-- Na het draaien: zet Realtime aan voor `notes`, `notes_labels` en
-- `notes_mappen` via Database → Replication (publication `supabase_realtime`).
-- `notes_instellingen` heeft geen realtime nodig.
--
-- Het schema deelt het Supabase-project met de agenda-app; alle tabellen
-- hebben daarom een `notes_`-prefix (behalve `notes` zelf) en eigen RLS.
-- ════════════════════════════════════════════════════════════════════════════

-- ── notes ─────────────────────────────────────────────────────────────────────
-- Eén tabel voor beide soorten content; `type` bepaalt welke velden gebruikt
-- worden. Checklist-items staan als jsonb op de rij (volgorde = arrayvolgorde),
-- passend bij de hele-rij-sync van de app. Labels via `label_ids` (agenda-patroon).
create table if not exists notes (
  id              text primary key,
  user_id         uuid references auth.users not null,
  type            text not null default 'notitie'
                  check (type in ('notitie', 'lijst')),
  titel           text not null default '',
  inhoud          text not null default '',            -- gebruikt bij type 'notitie'
  items           jsonb not null default '[]'::jsonb,  -- gebruikt bij type 'lijst': [{id, tekst, afgevinkt}]
  label_ids       text[] not null default '{}',
  map_id          text,                                -- null = geen map
  gearchiveerd    boolean not null default false,
  gearchiveerd_op timestamptz,
  aangemaakt_op   timestamptz not null default now(),
  gewijzigd_op    timestamptz not null default now()   -- client-managed bij updates (agenda-patroon, geen trigger)
);

alter table notes enable row level security;
drop policy if exists "eigen notes" on notes;
create policy "eigen notes" on notes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists notes_user_idx              on notes (user_id);
create index if not exists notes_user_gearchiveerd_idx on notes (user_id, gearchiveerd);
create index if not exists notes_user_map_idx          on notes (user_id, map_id);
create index if not exists notes_label_ids_idx         on notes using gin (label_ids);

-- ── notes_labels ──────────────────────────────────────────────────────────────
-- Eigen labeltabel (agenda-labels worden bewust niet hergebruikt). Zelfde
-- kolomvorm als agenda's `labels` zodat de LabelBeheer-component 1:1 werkt:
-- `kleur` is de basiskleur, `achtergrond_kleur`/`tekst_kleur` zijn optionele
-- eigen pill-kleuren.
create table if not exists notes_labels (
  id                text primary key,
  user_id           uuid references auth.users not null,
  naam              text not null,
  kleur             text not null,
  achtergrond_kleur text,
  tekst_kleur       text,
  aangemaakt_op     timestamptz not null default now()
);

alter table notes_labels enable row level security;
drop policy if exists "eigen notes_labels" on notes_labels;
create policy "eigen notes_labels" on notes_labels for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists notes_labels_user_idx on notes_labels (user_id);

-- ── notes_mappen ──────────────────────────────────────────────────────────────
-- Platte mappen (één niveau diep). Bij verwijderen van een map zet de app
-- `map_id` van de betreffende notes op null ("Geen map") — geen FK/cascade,
-- zodat notes nooit per ongeluk meeverwijderd worden.
create table if not exists notes_mappen (
  id            text primary key,
  user_id       uuid references auth.users not null,
  naam          text not null,
  kleur         text,
  aangemaakt_op timestamptz not null default now()
);

alter table notes_mappen enable row level security;
drop policy if exists "eigen notes_mappen" on notes_mappen;
create policy "eigen notes_mappen" on notes_mappen for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists notes_mappen_user_idx on notes_mappen (user_id);

-- ── notes_instellingen ────────────────────────────────────────────────────────
-- Eén rij per gebruiker. Staat in de database (niet alleen localStorage) zodat
-- een eventuele server-side cron (fase 10+) de archief-drempel kan lezen.
create table if not exists notes_instellingen (
  user_id            uuid primary key references auth.users not null,
  auto_archief_aan   boolean not null default false,
  auto_archief_dagen integer not null default 30
                     check (auto_archief_dagen > 0),
  aangemaakt_op      timestamptz not null default now(),
  gewijzigd_op       timestamptz not null default now()
);

alter table notes_instellingen enable row level security;
drop policy if exists "eigen notes_instellingen" on notes_instellingen;
create policy "eigen notes_instellingen" on notes_instellingen for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── notes_push_subscriptions ──────────────────────────────────────────────────
-- Web-push-subscriptions (TWA Fase 2), één rij per apparaat/endpoint. Bewust
-- een eigen tabel, gescheiden van agenda's `push_subscriptions`: anders zouden
-- agenda-reminders ook naar Notes-apparaten pushen en vice versa. Geen
-- realtime nodig. Zelfde kolomvorm als de agenda-tabel.
create table if not exists notes_push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  endpoint      text not null,
  p256dh        text not null,
  auth          text not null,
  aangemaakt_op timestamptz default now(),
  unique(user_id, endpoint)
);

alter table notes_push_subscriptions enable row level security;
drop policy if exists "eigen notes_push_subscriptions" on notes_push_subscriptions;
create policy "eigen notes_push_subscriptions" on notes_push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists notes_push_subscriptions_user_idx on notes_push_subscriptions (user_id);
