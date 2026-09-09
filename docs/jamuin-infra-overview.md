---
name: jamuin-infra-overview
description: "Map of Jamuin's apps deployed on the dalang.io VPS — repo location, docker port, nginx site, and public domain."
metadata:
  type: project
---

All Jamuin web apps run as docker-compose services on the same VPS, each bound to `127.0.0.1:<port>` and reverse-proxied by host nginx under `/etc/nginx/sites-available/`. See [[dalang-io-vps-proxy-architecture]] for why a domain must also be registered in the dalang.io dashboard before nginx ever receives its traffic.

| App | Repo (git@github.com:...) | Local path | Port | Nginx conf | Public domain |
|---|---|---|---|---|---|
| jamuin-web | ayyashcihuy/jamuin-web.git | /opt/apps/jamuin-web | 3001 | jamuin-web.conf | www.jamuin.co (apex `jamuin.co` redirects to www) |
| jamuin-workspace (Jamuin HR, Expo web export) | jamuinkopirempah-sketch/jamuin-workspace.git | /root/jamuin-workspace | 3002 | jamuin-workspace.conf | workspace.jamuin.co |
| finance (Jamuin Finance, Next.js 14 SSR) | jamuinkopirempah-sketch/finance.git | /opt/apps/finance | 3003 | finance.conf | finance.jamuin.co (pending: needs custom-domain registration in dalang.io + DNS records, see [[dalang-io-vps-proxy-architecture]]) |

Each app has its own `deploy.sh` (git pull --ff-only → docker compose build → docker compose up -d → docker image prune -f) except jamuin-workspace, which is redeployed manually the same way (no script yet).

`jamuin-workspace` and `finance` also have Supabase backends with `supabase/migrations/*.sql` that are **not** applied automatically — no Supabase CLI/access token is configured on this VPS, so new migrations must be run manually in each project's Supabase SQL Editor after a pull that adds them.