---
name: vps-monitor-app-plan
description: "Rencana lengkap aplikasi mobile + web internal untuk memantau kesehatan/traffic/uptime beberapa VPS (mulai dari vps-5bd9f069), belum mulai dibangun — akan dikerjakan dari PC lokal user, bukan di VPS."
metadata:
  type: project
---

Proyek ini **belum mulai dibangun**. Percobaan scaffold Expo di VPS `vps-5bd9f069` (2026-09-09) dibatalkan karena disk VPS itu sendiri lagi lambat parah (2.9 MB/s tulis, seharusnya puluhan MB/s) akibat masalah storage backend dalang.io yang masih berlangsung (lihat [[dalang-io-storage-osd-incident]]). User akan lanjutkan development dari PC lokalnya sendiri, bukan di VPS ini.

## Tujuan
Aplikasi internal (bukan client-facing dulu) untuk:
1. Pantau kesehatan/uptime/traffic beberapa VPS sekaligus (bukan cuma `vps-5bd9f069` — user berencana pisah ke VPS lain juga ke depannya).
2. Analisa downtime historis per VPS sebagai dasar keputusan "worth it extend VPS ini atau tidak" (relevan banget mengingat 2 insiden dalang.io yang sudah terjadi: downtime 86 menit 09 Sep + storage backend degraded).
3. Bisa tambah VPS baru + service di bawahnya + pilih metric apa yang mau dipantau, semua manual lewat app (bukan config file).

## Constraint Arsitektur Kunci (jangan dilanggar saat build)
**Monitoring TIDAK BOLEH bergantung ke VPS manapun yang dipantau** — kalau VPS-nya mati, app tetap harus bisa kasih tahu itu mati. Solusi yang disepakati:
- **Data plane**: Supabase (Postgres, managed pihak ke-3, independen dari dalang.io) — registry VPS/service, semua time-series, incident log.
- **Check plane (eksternal)**: GitHub Actions terjadwal (cron, tiap ~5 menit) — curl publik ke domain tiap VPS terdaftar (lewat jalur user asli, apa adanya termasuk proxy dalang.io), tulis ke Supabase (`checks`, `source='external'`), kirim Expo Push kalau status berubah up↔down. Ini SATU-SATUNYA sumber kebenaran untuk uptime/downtime (dipakai untuk analisa "worth it extend atau tidak").
- **Agent lokal per VPS** (opsional, perluasan dari `/root/scripts/healthcheck.sh` yang sudah ada di `vps-5bd9f069`): kirim data resource usage (cpu/mem) + traffic aggregate ke Supabase juga (`source='internal_agent'`) — cuma jalan kalau VPS hidup, itu wajar, bukan untuk deteksi down.
- **Mobile & web app**: baca langsung dari Supabase (+ realtime subscription), TIDAK PERNAH nembak VPS secara langsung untuk cek status. Terima Expo Push notification.

Kenapa desain ini: kalau backend monitoring numpang di salah satu VPS yang dipantau, pas VPS itu mati, blind spot pas paling butuh kabar (persis skenario 09 Sep). Lihat [[jamuin-swap-and-healthcheck]] untuk healthcheck lokal yang sudah ada duluan di `vps-5bd9f069`.

## Skema Data (Supabase)

vps — id, name, label, primary_domain, provider, renewal_date, monthly_cost, notes, is_active
services — id, vps_id FK, name, domain, health_check_path, expected_status_codes
service_metric_configs — id, service_id FK, metric_type ('uptime'|'response_time'|'resource_usage'|'traffic'), enabled, interval_minutes
checks — id, vps_id, service_id (nullable), source ('external'|'internal_agent'), status, http_code, latency_ms, checked_at
resource_snapshots — id, vps_id, service_id, cpu_pct, mem_mb, captured_at (kosong kalau VPS mati, wajar)
traffic_aggregates — id, service_id, bucket_start, bucket_end, request_count, avg_response_ms, status_breakdown jsonb
incidents — id, vps_id, service_id (nullable), started_at, ended_at, detected_by, duration_minutes
device_push_tokens — user_id, expo_push_token

## Scope v1 (disepakati user: internal dulu, bukan client-facing)
- Overview: status tiap VPS (up/down + uptime % 24 jam/7 hari)
- Detail VPS: daftar service di bawahnya, tambah service manual, toggle metric per service
- Grafik traffic per service, resource usage (cpu/mem) kalau agent lokal terpasang
- Histori insiden per VPS (dasar hitung uptime% & total downtime menit → dasar keputusan extend/tidak)
- Auth: simpel dulu (basic auth/single user), belum multi-tenant

## Dua Repo Terpisah, Desain Sama
**Style yang disepakati untuk KEDUANYA: pixelated, kontras hitam-putih penuh** (bukan grayscale halus — blocky, border tegas, tanpa gradient/shadow, font pixel misal Press Start 2P untuk judul + monospace untuk body, elemen UI kotak tanpa border-radius).

1. **Mobile app** (Expo/React Native + TypeScript + expo-router) — reuse pola dari `jamuin-workspace` (`/root/jamuin-workspace`, sudah punya `expo-notifications` utk push). Rencana screens: VPS List → VPS Detail (services + uptime history sebagai grid pixel/heatmap ala kontribusi GitHub) → Add VPS → Add Service (form + checkbox toggle metric).
2. **Web app** (repo terpisah) — style sama (pixelated B&W), TAPI dengan **max-width viewport 1280px** — kalau dibuka di layar lebih besar, terlihat seperti "layar kecil" di tengah, kesan retro (semacam CRT monitor tua di layar modern). Belum ditentukan stack-nya (kandidat: Next.js reuse pola `finance`/`jamuin-web`, atau Vite React sederhana kalau tidak perlu SSR — user belum diminta pilih, tanyakan saat mulai build).

## Yang Perlu Disiapkan User Sebelum Mulai Build (dari sesi manapun)
1. Project Supabase baru khusus tool ini (terpisah dari data client) — user yang bikin sendiri, lalu kasih URL + service role key.
2. Repo GitHub untuk GitHub Actions cron + secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `EXPO_ACCESS_TOKEN`).
3. Keputusan: reuse akun Expo `jamuin-workspace` atau bikin project Expo baru untuk push notification.

Lihat juga [[jamuin-infra-overview]], [[dalang-io-vps-proxy-architecture]], [[jamuin-swap-and-healthcheck]] untuk konteks infra yang jadi latar belakang proyek ini.