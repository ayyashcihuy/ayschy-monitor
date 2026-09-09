---
name: dalang-io-storage-osd-incident
description: "CONFIRMED by dalang.io: consumer-grade SSDs (no power-loss protection) in their shared storage tier degrade under sustained write load — ongoing since ~15 Jul 2026, no ETA to fix. CONFIRMED root cause of the 09 Sep 2026 VM outage too: storage stall → host (x99-04) memory overcommit (2x) → host OOM-killer force-killed the VM at 11:00:54 UTC. No SLA in the package; goodwill compensation only, pending owner decision."
metadata:
  type: project
---

## Timeline & confirmed root cause (dalang.io / Efran, ticket responses 2026-09-09)

1. **Storage degradation**: ongoing since **~15 July 2026** (~2 months), known internally to dalang.io but never proactively disclosed to customer. Root cause confirmed: the SSDs in their shared storage tier are **consumer-grade, no power-loss protection**, not designed for sustained write load — under load, commit latency spikes to **183–2549ms** (healthy: 1–3ms). Explicitly NOT a network/inter-OSD/tenant/rebalancing issue. **Fix = replace with enterprise-grade SSDs — no ETA, pending owner decision.**
2. Re-tested independently on `vps-5bd9f069` on 2026-09-09 during a normal (non-off-peak) session: `dd` write 100MB → **2.9 MB/s**; `iostat` showed **w_await 697ms, %iowait 24.8% while the VM was otherwise idle**. Confirms the problem was still fully active weeks into "we're monitoring it," not a one-off.
3. **The 09 Sep 2026 86-minute VM outage (10:21–11:47 UTC) is CONFIRMED caused by this same storage problem** — full causal chain per dalang.io: slow storage → I/O writeback stall inside the VM → simultaneously the physical **host `x99-04`** had memory **overcommitted ~2x** its 128GB physical RAM → host kernel OOM-killer force-killed the VM process at **11:00:54 UTC**. The host itself did NOT reboot; this was not maintenance. VM came back up at 11:47 UTC. This matches and confirms the independent forensic analysis done from inside the guest (no kernel panic/OOM/disk-error logged in-guest, ungraceful stop, stale docker sandboxes on restart) — the guest simply vanished mid-execution, consistent with an external hard kill.
4. **Remediation plan (dalang.io), no firm timeline for any of it, "menunggu keputusan pemilik":**
   - Adding a new physical node to the cluster (provisioning in progress) to relieve the 2x host memory overcommit — reduces recurrence risk of the same OOM-kill mechanism, but doesn't eliminate it until done.
   - Host-level memory admission control (planned, not scheduled).
   - SSD replacement to enterprise-class (planned, not scheduled).
5. **No SLA**: package has no written uptime SLA → no automatic service credit. Only a discretionary "goodwill compensation" submitted to the owner for this specific incident.
6. **No status page yet** — acknowledged gap, "sedang merencanakan," no date.

## Practical implications going forward
- **This can recur at any time** until all three remediation items above ship — none have a committed date. Treat `vps-5bd9f069` as still exposed to sudden, silent, total VM kill from the host side.
- **The swap file added in [[jamuin-swap-and-healthcheck]] does NOT protect against this failure mode.** That swap only relieves memory pressure *inside* the guest; the OOM-kill that happened on 09 Sep was the **host's** kernel killing the whole VM process due to the **host's own** overcommitted RAM — invisible and unreachable from inside the guest, nothing installable in the guest fixes it.
- The only real mitigations available to the user: (a) keep pushing dalang.io for a committed timeline on the node addition / SSD replacement / admission control, (b) get external, VPS-independent monitoring in place ASAP so a repeat incident is caught within minutes instead of by chance — this is exactly why [[vps-monitor-app-plan]] is designed to never depend on the monitored VPS itself, (c) as the business scales to more apps/VPS on dalang.io, weigh this unresolved, undated, no-SLA risk explicitly in any "extend or migrate" decision.
- Host identifier for future reference/ticket correlation: **x99-04**.

Before recommending any heavy build/deploy work on this VPS in a future session, quickly re-check disk health first (`dd if=/dev/zero of=/root/.disktest bs=1M count=50 oflag=direct; rm -f /root/.disktest` — expect tens of MB/s if healthy) rather than assuming it's fixed, since dalang.io has given no ETA.