---
name: jamuin-swap-and-healthcheck
description: "Swap file + cron healthcheck yang dipasang di dalang.io VPS setelah insiden downtime 2026-09-09, plus daftar risiko performa sisi development yang teridentifikasi."
metadata:
  type: project
---

Setelah insiden VPS mati total ±86 menit pada 2026-09-09 (10:21–11:47 UTC, root cause: kemungkinan besar event di level hypervisor/host Incus milik dalang.io — bukan OOM/kernel panic/disk error di guest, dan BUKAN dipicu traffic spike karena nginx access log cuma catat 21 request di jam sebelum crash), dipasang:

- **Swap 2GB** di `/swapfile`, persist di `/etc/fstab`, `vm.swappiness=10` via `/etc/sysctl.d/99-jamuin-swap.conf` — jaring pengaman untuk lonjakan memori sesaat karena tidak ada satu pun container (jamuin-web/jamuin-workspace/finance) yang punya `mem_limit`/`cpus` di docker-compose.yml masing-masing.
- **Cron healthcheck** `/root/scripts/healthcheck.sh` via `/etc/cron.d/jamuin-healthcheck`, jalan tiap 3 menit: curl ke masing-masing domain lewat nginx lokal (Host header, port 80), kalau 3x gagal berturut-turut → `docker compose restart` service itu + catat ke `/var/log/jamuin-healthcheck.log`. Notifikasi Telegram opsional lewat `/root/scripts/healthcheck.env` (belum diisi — user belum punya bot token, cuma ada `.env.example`-nya).

**Risiko performa sisi development yang teridentifikasi (belum diperbaiki, sekadar catatan untuk saran berikutnya):**
1. Tidak ada `mem_limit`/`cpus` di ketiga `docker-compose.yml` — satu container bisa menghabiskan semua resource VM.
2. `finance` (Next.js 14 SSR, `next start` biasa bukan `output: standalone`) — middleware panggil `getUser()` Supabase per request (lihat komentar MTU/DNS di compose-nya), tidak ada caching/ISR terlihat di `next.config.mjs` → tiap request = round-trip auth API, rawan jadi bottleneck pertama kalau ada lonjakan trafik.
3. nginx `gzip on` tapi `gzip_types` di `/etc/nginx/nginx.conf` semua ke-comment → cuma html yang dikompres, JS/CSS/JSON tidak.
4. Tidak ada `limit_req`/`limit_conn` di nginx sama sekali — tidak ada rate limiting antara internet dan container.

Lihat [[jamuin-infra-overview]] dan [[dalang-io-vps-proxy-architecture]] untuk konteks infra lengkap.