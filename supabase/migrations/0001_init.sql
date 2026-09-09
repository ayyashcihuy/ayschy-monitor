-- jamuin-monitor initial schema
-- See ../../docs/vps-monitor-app-plan.md for the full design rationale.
--
-- Design constraint: this schema is the ONLY source of truth for uptime/downtime.
-- Nothing here depends on any monitored VPS being reachable.

create extension if not exists "pgcrypto";

-- ── Registry ─────────────────────────────────────────────────────────────

create table vps (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               -- e.g. "vps-5bd9f069"
  label text not null,                     -- human-friendly display name
  primary_domain text,                     -- domain used for external curl checks
  provider text,                           -- e.g. "dalang.io"
  renewal_date date,
  monthly_cost numeric,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  vps_id uuid not null references vps(id) on delete cascade,
  name text not null,                      -- e.g. "jamuin-web"
  domain text not null,                    -- e.g. "www.jamuin.co"
  health_check_path text not null default '/',
  expected_status_codes int[] not null default array[200],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (vps_id, name)
);

create table service_metric_configs (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  metric_type text not null check (metric_type in ('uptime', 'response_time', 'resource_usage', 'traffic')),
  enabled boolean not null default true,
  interval_minutes int not null default 5,
  created_at timestamptz not null default now(),
  unique (service_id, metric_type)
);

-- ── Time series ──────────────────────────────────────────────────────────

create table checks (
  id uuid primary key default gen_random_uuid(),
  vps_id uuid not null references vps(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  source text not null check (source in ('external', 'internal_agent')),
  status text not null check (status in ('up', 'down')),
  http_code int,
  latency_ms int,
  checked_at timestamptz not null default now()
);
create index checks_vps_checked_at_idx on checks (vps_id, checked_at desc);
create index checks_service_checked_at_idx on checks (service_id, checked_at desc);

create table resource_snapshots (
  id uuid primary key default gen_random_uuid(),
  vps_id uuid not null references vps(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  cpu_pct numeric,
  mem_mb numeric,
  captured_at timestamptz not null default now()
);
create index resource_snapshots_vps_captured_at_idx on resource_snapshots (vps_id, captured_at desc);

create table traffic_aggregates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  bucket_start timestamptz not null,
  bucket_end timestamptz not null,
  request_count int not null default 0,
  avg_response_ms numeric,
  status_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index traffic_aggregates_service_bucket_idx on traffic_aggregates (service_id, bucket_start desc);

-- ── Incidents ────────────────────────────────────────────────────────────

create table incidents (
  id uuid primary key default gen_random_uuid(),
  vps_id uuid not null references vps(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  detected_by text not null check (detected_by in ('external', 'internal_agent')),
  duration_minutes int generated always as (
    case when ended_at is not null
      then ceil(extract(epoch from (ended_at - started_at)) / 60)::int
      else null
    end
  ) stored
);
create index incidents_vps_started_at_idx on incidents (vps_id, started_at desc);
create index incidents_open_idx on incidents (vps_id, service_id) where ended_at is null;

-- ── Push notifications ───────────────────────────────────────────────────

create table device_push_tokens (
  user_id text not null,
  expo_push_token text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- v1 is single-user/internal (see plan: "Auth: simpel dulu"). Lock every
-- table down by default; the checker and app both use the service-role key
-- (bypasses RLS) until real per-user auth exists.

alter table vps enable row level security;
alter table services enable row level security;
alter table service_metric_configs enable row level security;
alter table checks enable row level security;
alter table resource_snapshots enable row level security;
alter table traffic_aggregates enable row level security;
alter table incidents enable row level security;
alter table device_push_tokens enable row level security;
