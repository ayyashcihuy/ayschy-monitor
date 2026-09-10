-- VPS-level uptime stats for the overview badge + VPS Detail heatmap.
-- Computed server-side (not by pulling every raw `checks` row to the
-- client) since a VPS can accumulate tens of thousands of check rows over
-- time. Only considers the VPS-level check (service_id is null, i.e. the
-- primary_domain probe) — matches what the overview status badge already
-- shows (see docs/vps-monitor-app-plan.md, "Overview: status tiap VPS
-- (up/down + uptime % 24 jam/7 hari)").

create or replace function vps_uptime_summary(p_vps_id uuid, p_days int default 84)
returns jsonb
language sql
stable
as $$
  with recent as (
    select status, checked_at
    from checks
    where vps_id = p_vps_id
      and service_id is null
      and source = 'external'
      and checked_at >= now() - (p_days || ' days')::interval
  ),
  daily as (
    select
      (checked_at at time zone 'utc')::date as day,
      count(*) filter (where status = 'up') as up_count,
      count(*) as total_count
    from recent
    group by day
  )
  select jsonb_build_object(
    'uptime_24h', (
      select case when count(*) = 0 then null
        else round(100.0 * count(*) filter (where status = 'up') / count(*), 1) end
      from recent where checked_at >= now() - interval '24 hours'
    ),
    'uptime_7d', (
      select case when count(*) = 0 then null
        else round(100.0 * count(*) filter (where status = 'up') / count(*), 1) end
      from recent where checked_at >= now() - interval '7 days'
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', day,
        -- 'up': every check that day succeeded. 'down': at least one
        -- failed. Deliberately binary (not a %) to keep the heatmap a
        -- clean 2-state grid rather than a gradient (see the apps' shared
        -- pixelated B&W style — no gradients/shades).
        'status', case when up_count = total_count then 'up' else 'down' end
      ) order by day), '[]'::jsonb)
      from daily
    )
  );
$$;

grant execute on function vps_uptime_summary(uuid, int) to anon, authenticated;
