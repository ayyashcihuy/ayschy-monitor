# jamuin-monitor

Internal (not client-facing) tool to monitor uptime/traffic/resource usage
across multiple VPS and the services running on them — starting with
`vps-5bd9f069` (jamuin-web, jamuin-workspace, finance). Built after two
dalang.io incidents (86-minute VM outage + ongoing storage degradation) made
clear that Jamuin has zero independent visibility into its own infra. Full
background and rationale: [docs/vps-monitor-app-plan.md](docs/vps-monitor-app-plan.md).

## Architecture

**Monitoring must never depend on any VPS it monitors** — if a VPS goes
dark, the monitor still has to report that. So:

- **Data plane**: Supabase (Postgres) — independent third party, holds the
  registry, all time-series data, and incident log. Single source of truth.
- **Check plane**: [checker/](checker/) runs on GitHub Actions (cron, every
  ~5 min), *not* on any monitored VPS. It curls each registered domain over
  the public internet, writes results to Supabase, and sends an Expo push +
  opens/closes an incident row on every up↔down transition.
- **Apps**: [apps/mobile](apps/mobile/) (Expo/React Native) and
  [apps/web](apps/web/) (Vite/React) both read Supabase directly (+ realtime
  subscription) and never poll a VPS themselves.

```
apps/mobile/   Expo app — VPS list → VPS detail → add VPS/service
apps/web/      Vite web dashboard, same UI, capped at 1280px viewport
checker/       GitHub Actions external checker (writes to Supabase)
supabase/      SQL migrations (schema)
docs/          Design/incident background notes this project is based on
```

Both apps share the same visual style: pixelated, full black/white
contrast — blocky borders, no gradients/shadows/border-radius, monospace +
pixel-font headings.

## One-time setup

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → sign in → **New project**.
2. Pick a name (e.g. `jamuin-monitor`), a strong DB password (save it
   somewhere — you likely won't need it day-to-day, Supabase manages the
   connection), and a region close to you or your users.
3. Wait ~2 min for provisioning.
4. **Settings → API**: copy the **Project URL** and the **anon public**
   key → these go in `apps/mobile/.env` and `apps/web/.env` (see step 3).
5. Same page, reveal the **service_role** key (server-only, bypasses RLS —
   never put this in a mobile/web app) → this goes in the GitHub Actions
   secret for [checker/](checker/) (see step 4).
6. **SQL Editor** → run every file in
   [supabase/migrations/](supabase/migrations/) **in filename order**
   (`0001_init.sql`, then `0002_...`, etc. — paste each one's contents and
   Run separately). `0001` creates every table (`vps`, `services`,
   `checks`, `incidents`, etc.) with RLS enabled; `0002` adds the policies
   that actually let the anon key read/write (v1 has no real auth yet —
   see feat/auth-basic in the roadmap — so these are intentionally wide
   open for now). Whenever a new numbered file shows up after a `git pull`,
   run just that one file — Supabase has no CLI configured on this
   project yet, so nothing applies automatically.

### 2. Create the GitHub repo (for the Actions cron)

Push this folder to a new GitHub repo, then in **Settings → Secrets and
variables → Actions**, add:

- `SUPABASE_URL` — the Project URL from step 1.4
- `SUPABASE_SERVICE_KEY` — the service_role key from step 1.5
- `EXPO_ACCESS_TOKEN` — optional for now (needed once you use Expo's push
  API from a project that requires an access token; can add later)

The workflow at [.github/workflows/check.yml](.github/workflows/check.yml)
runs every 5 minutes automatically once these secrets exist and there's at
least one row in the `vps`/`services` tables.

### 3. Configure the apps

```bash
cp apps/mobile/.env.example apps/mobile/.env   # EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY
cp apps/web/.env.example apps/web/.env         # VITE_SUPABASE_URL / _ANON_KEY
```

Fill both with the URL + **anon** key from step 1.4 (never the service_role
key here).

### 4. Install and run

```bash
npm install                 # from repo root — installs all workspaces
npm run web                 # → http://localhost:5173
npm run mobile               # → Expo dev server (scan QR with Expo Go)
```

Add your first VPS from either app's **+ ADD VPS** button — fill in its
`primary_domain` so the checker has something to curl. Once the GitHub
Actions secrets are set and a VPS exists, the checker starts recording
`checks` every 5 minutes and both apps update live via Supabase realtime.

### 5. Push notifications (optional, can skip for now)

The mobile app registers for Expo push on launch and stores its token in
`device_push_tokens`. Decide later whether to reuse the `jamuin-workspace`
Expo account or create a new one — no action needed until you want pushes
working end-to-end.

## Status

Base scaffold — schema, checker, and both apps' VPS list/detail/add-VPS
flow are wired to Supabase. Not yet built: service-level add/edit UI,
metric toggles, traffic/resource charts, uptime-% heatmap, local
resource-usage agent (`source='internal_agent'`). See
[docs/vps-monitor-app-plan.md](docs/vps-monitor-app-plan.md) "Scope v1" for
the full target list.
