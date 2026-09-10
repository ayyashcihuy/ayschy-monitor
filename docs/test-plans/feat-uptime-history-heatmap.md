# Test plan — feat/uptime-history-heatmap

Covers both the uptime %/heatmap feature and the status-badge redesign
that got folded into the same branch (up/warning/down icon, replacing the
old whole-row invert). Branch: `feat/uptime-history-heatmap`.

## 0. Prerequisite — run the new migration first

**`supabase/migrations/0003_uptime_summary.sql` must be run in the
Supabase SQL Editor before anything below will work.** It adds the
`vps_uptime_summary()` function both apps now call via `supabase.rpc(...)`.

- **Expected:** running it succeeds with no error. Sanity-check directly in
  SQL Editor:
  ```sql
  select vps_uptime_summary((select id from vps limit 1), 7);
  ```
  should return a JSON object like
  `{"uptime_24h": 100, "uptime_7d": 100, "daily": [...]}`, not an error.

## 1. VPS List — uptime badge + status badge

- Open VPS List (mobile or web).
- **Expected:** each row now shows, under the domain, a line like `24H:
  99.5%` (or `24H: —` if the VPS has no checks yet in the last 24h). On the
  right side of the row, a small square box with one character:
  - `O` = up
  - `!` = warning (up but slow — see §3)
  - `X` = down, box filled black, `X` in white
  - `?` = no check recorded yet, dashed border
- **Expected regression check:** the old behavior (whole row turning black
  when down) is gone — only the badge box changes, the row background stays
  white.

## 2. VPS Detail — header badge + 24H/7D numbers + heatmap

- Open a VPS that has at least a few hours of check history (e.g. jamuin
  machine or workspace-jamuin).
- **Expected:** header box shows label + domain on the left, status badge
  (O/!/X/?) on the right, and below that a line `24H: X%   7D: Y%`.
- Below the header, a **12-week heatmap grid** (12 columns × 7 rows of
  small squares), oldest day on the left, today on the right-most column.
  - **Expected:** days before the VPS was added (or before the checker was
    deployed) show as **dashed-border empty cells**.
  - Days where every check succeeded show as a **solid black cell**.
  - Days with at least one failed check show as a **white cell with a
    small black square in the center**.
  - A legend below the grid labels all three states.
- Scroll the grid horizontally if the screen is narrow (mobile) —
  **expected:** it scrolls smoothly, doesn't break page layout.

## 3. Warning state (up but slow)

Hard to trigger naturally without a genuinely slow endpoint. Two ways to
test:
- **Manual DB test:** in Supabase Table Editor, insert a row into `checks`
  for one of your VPS with `status = 'up'`, `latency_ms = 3000`,
  `service_id = null`, `source = 'external'`, `checked_at = now()`. Reload
  VPS List / Detail.
  - **Expected:** that VPS's badge becomes `!` with a visibly thicker
    border (badge itself still white/black, no color), not `O`.
- Delete that test row afterward so it doesn't skew `checks` history/
  uptime% permanently.

## 4. Service rows — same badge, independently sourced

- Open a VPS that has at least one service (add one via `feat/service-
  management` if needed).
- **Expected:** each service row also shows a status badge on the right,
  driven by **that service's own latest external check** (`service_id =
  <service.id>`), independent from the VPS-level badge in the header —
  i.e. a service can show `X` while the VPS header shows `O`, or vice
  versa, since the checker probes each separately (see
  `supabase/functions/checker`).
- Services with no checks yet (e.g. just created, checker hasn't run
  since) show `?`.

## 5. Cross-app consistency

- Do the same VPS/service look the same (same badge state, same 24H/7D
  numbers, same heatmap shape) on mobile and web? They read the same
  Supabase data, so **expected:** yes, modulo a few seconds of staleness
  between the two if you don't manually refresh.

## 6. Realtime update (optional, needs to catch a live checker tick)

- Leave VPS List open and wait for the next checker run (~5 min, or
  trigger manually — see supabase/functions/checker's manual-invoke
  comment).
- **Expected:** the 24H badge / status badge update automatically via the
  existing realtime subscription on `checks` INSERT — no manual refresh
  needed on mobile; web currently reloads on mount only (see note below).

## Known gap to flag, not a bug to fix in this branch

Web's `VpsList`/`VpsDetail` don't yet have a realtime subscription like
mobile's `useVpsOverview` — they only reload on navigation. Not in scope
here; worth a follow-up if it's noticeably annoying in daily use.
