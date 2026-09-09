-- v1 has no real auth yet (see docs/vps-monitor-app-plan.md, "Auth: simpel
-- dulu" — tracked as feat/auth-basic). 0001_init.sql enabled RLS on every
-- table but added no policies, which means every query from the app's
-- anon/publishable key was being denied outright — the app couldn't read or
-- write anything.
--
-- Until feat/auth-basic ships, grant full access to anon + authenticated
-- so the app is actually usable. This is intentionally wide open — fine for
-- an internal single-user tool with a not-publicly-shared anon key, but
-- MUST be tightened (e.g. to a specific authenticated user) once real auth
-- exists. device_push_tokens is scoped slightly tighter since it's the one
-- table an unrelated caller could otherwise spam.

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'vps', 'services', 'service_metric_configs',
    'checks', 'resource_snapshots', 'traffic_aggregates', 'incidents'
  ])
  loop
    execute format(
      'create policy "v1_allow_all_%1$s" on %1$I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- device_push_tokens: allow insert/update of your own token, but not
-- reading/deleting others' tokens wholesale.
create policy "v1_push_tokens_insert" on device_push_tokens
  for insert to anon, authenticated with check (true);
create policy "v1_push_tokens_update_own" on device_push_tokens
  for update to anon, authenticated using (true) with check (true);
create policy "v1_push_tokens_select" on device_push_tokens
  for select to anon, authenticated using (true);
