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
- **Check plane**: [supabase/functions/checker](supabase/functions/checker)
  (a Supabase Edge Function), invoked every ~5 min by a Database → Cron Job
  — runs on Supabase's infra, *not* on any monitored VPS. It curls each
  registered domain over the public internet, writes results to Supabase,
  and sends an Expo push + opens/closes an incident row on every up↔down
  transition. [checker/](checker/) is the same logic as a plain Node
  script — kept for local testing and as a manual GitHub Actions fallback
  (originally the primary cron, moved off Actions after a billing lock;
  see the file headers in both for details). Keep the two in sync if the
  check logic changes.
- **Apps**: [apps/mobile](apps/mobile/) (Expo/React Native) and
  [apps/web](apps/web/) (Vite/React) both read Supabase directly (+ realtime
  subscription) and never poll a VPS themselves.

```
apps/mobile/               Expo app — VPS list → VPS detail → add VPS/service
apps/web/                  Vite web dashboard, same UI, capped at 1280px viewport
supabase/functions/checker/  Edge Function — the actual scheduled checker (Supabase Cron)
supabase/migrations/       SQL schema
checker/                   Node/GitHub Actions version of the checker — local testing + manual fallback
docs/                      Design/incident background notes this project is based on
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
   never put this in a mobile/web app or commit it anywhere). Supabase
   injects this automatically into every Edge Function's environment, so
   you won't need to paste it manually for step 2 — just keep it handy for
   `checker/.env` if you want to run the Node version locally.
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

### 2. Deploy the checker (Supabase Edge Function + Cron)

```bash
npx supabase login                            # opens a browser to authenticate the CLI
npx supabase link --project-ref <your-ref>    # ref is in the project URL / Settings → General
npx supabase functions deploy checker         # deploys supabase/functions/checker
```

Optional — only needed once you actually want push notifications working:

```bash
npx supabase secrets set EXPO_ACCESS_TOKEN=<token>
```

Then schedule it: **Supabase Dashboard → Database → Cron Jobs → Create a
new cron job** →
- Name: `jamuin-monitor-checker`
- Schedule: `*/5 * * * *`
- Type: **Edge Function**
- Function: `checker`, method `POST` — the dashboard fills in the URL and
  a `service_role` Authorization header for you automatically.

That's it — no GitHub repo/secrets needed for the cron itself. (A GitHub
Actions copy still exists at [.github/workflows/check.yml](.github/workflows/check.yml)
for manual/local-parity testing — see its header comment for why it's not
the primary schedule.)

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
`primary_domain` so the checker has something to curl. Once the Edge
Function is deployed + scheduled (step 2) and a VPS exists, the checker
starts recording `checks` every 5 minutes and both apps update live via
Supabase realtime. To verify it's actually running: **Dashboard →
Edge Functions → checker → Logs** (or **Database → Cron Jobs → Run
history**), or just check the `checks` table for new rows.

### 5. Push notifications (optional, can skip for now)

The mobile app registers for Expo push on launch and stores its token in
`device_push_tokens`. Decide later whether to reuse the `jamuin-workspace`
Expo account or create a new one — no action needed until you want pushes
working end-to-end.

## Status

Schema, checker (now Supabase Edge Function + Cron), and both apps' VPS
list/detail/add-VPS + add/edit/delete-service + metric-toggle flows are
wired to Supabase. Not yet built: traffic/resource charts, uptime-%
heatmap, incident-based downtime analytics, local resource-usage agent
(`source='internal_agent'`), basic auth. See
[docs/vps-monitor-app-plan.md](docs/vps-monitor-app-plan.md) "Scope v1" for
the full target list.
