-- JeFIT · Vélo (JeRIDE intégré) : sorties et parcours, rangés par compte.
-- À coller UNE SEULE FOIS dans le projet Supabase JeFIT › SQL Editor › Run.
create table if not exists public.jeride_items (
  user_id    uuid        not null default auth.uid() references auth.users on delete cascade,
  kind       text        not null,              -- 'sessions' ou 'routes'
  id         text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  u          bigint      not null default 0,    -- date de dernière modification (ms)
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
alter table public.jeride_items enable row level security;
create policy "jeride lire"     on public.jeride_items for select using (auth.uid() = user_id);
create policy "jeride ajouter"  on public.jeride_items for insert with check (auth.uid() = user_id);
create policy "jeride modifier" on public.jeride_items for update using (auth.uid() = user_id);
