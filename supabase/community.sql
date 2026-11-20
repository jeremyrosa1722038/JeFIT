-- JeFIT · Communauté : chaque compte connecté peut voir la liste des profils
-- et l'accueil / les badges d'un profil, en lecture seule.
-- À coller UNE SEULE FOIS dans le projet Supabase JeFIT › SQL Editor › Run
-- (après jeride_items.sql, car les sorties vélo sont aussi montrées).
--
-- Les tables restent privées (règles RLS inchangées) : on passe par deux fonctions
-- qui ne renvoient jamais l'e-mail, et qui ignorent les profils masqués
-- (Paramètres › Mon compte › « Visible dans la communauté » = Non).

-- Liste des profils : nom, nombre de séances, date de la dernière séance, avatar
drop function if exists public.jefit_community();
create function public.jefit_community()
returns table (user_id uuid, name text, n int, last bigint, updated_at timestamptz, av text)
language sql stable security definer set search_path = public as $$
  select d.user_id,
         d.data->>'name',
         coalesce(jsonb_array_length(d.data->'sessions'), 0),
         (d.data->'sessions'->0->>'start')::numeric::bigint,
         d.updated_at,
         d.data->>'av'
  from public.jefit_data d
  where auth.uid() is not null
    and coalesce((d.data->>'pub')::boolean, true)
    and coalesce(d.data->>'name', '') <> ''
  order by d.updated_at desc;
$$;

-- Un profil : ses données (sans e-mail) + ses sorties vélo
create or replace function public.jefit_profile(uid uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'data', d.data - 'email' - 'tomb' - 'mly',
    'rides', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'start', r.data->>'start', 'name', r.data->>'name',
        'el', r.data->'el', 'dist', r.data->'dist', 'kj', r.data->'kj', 'sum', r.data->'sum'))
      from public.jeride_items r
      where r.user_id = d.user_id and r.kind = 'sessions' and not r.deleted
    ), '[]'::jsonb))
  from public.jefit_data d
  where auth.uid() is not null
    and d.user_id = uid
    and coalesce((d.data->>'pub')::boolean, true);
$$;

-- Réservé aux comptes connectés
revoke execute on function public.jefit_community() from public, anon;
revoke execute on function public.jefit_profile(uuid) from public, anon;
grant execute on function public.jefit_community() to authenticated;
grant execute on function public.jefit_profile(uuid) to authenticated;
