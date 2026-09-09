---
name: dalang-io-vps-proxy-architecture
description: "This VPS (host for jamuin-web, jamuin-workspace, finance) has no real public IP — all public domains must be registered as custom domains in the dalang.io dashboard before nginx ever sees the traffic."
metadata:
  type: project
---

The VPS hosting `jamuin-web`, `jamuin-workspace`, and `finance` (root user, /opt/apps + /root/jamuin-workspace) is provisioned by **dalang.io** and has **no real public IP of its own**. Its actual NIC (`enp5s0`) only has a private IP (`10.70.0.57`). The address `103.230.81.47` that `curl ifconfig.me` reports from inside the VPS is dalang.io's own edge/gateway — all internet traffic to port 80/443 on that IP is intercepted by dalang.io's proxy first, then tunneled to this VPS over a private WireGuard-style mesh (`wayangi`, connects to `wayangi.dalang.io`, account `ayyashcihuy@gmail.com`).

**Consequence:** adding a plain DNS `A` record pointing a domain at `103.230.81.47` does NOT make it reach this VPS's nginx. dalang.io's proxy replies "Domain Not Found - Dalang Proxy" for any hostname it doesn't recognize, no matter what nginx has configured locally. certbot HTTP-01 will also always fail this way (validation requests get intercepted and never reach the VPS).

**Correct flow for any new domain/subdomain that should reach an app on this VPS:**
1. In the **dalang.io dashboard**, add the hostname as a new "custom domain" (works fine for subdomains, e.g. `workspace.jamuin.co`, `finance.jamuin.co` — multiple domains per VPS are supported, contrary to an early false alarm where tokens appeared to regenerate).
2. Dalang.io returns a CNAME (root of the hostname → `domain.dalang.io`) + a TXT ownership record + a CNAME/TXT pair for ACME/SSL validation (their custom-domain feature is built on **Cloudflare for SaaS** — record names look like `_cf-custom-hostname.<host>` and `dcv.cloudflare.com`). These values are per-domain/account and must come from the dashboard — never guess them.
3. Those records get added at whatever DNS provider actually hosts the zone for the root domain (as of the `jamuin.co` setup, that was **Niagahoster** cPanel/Zone Editor — confirm this hasn't changed before giving instructions).
4. Once dalang.io's checker goes green, SSL is issued and traffic starts flowing automatically — **no certbot needed on the VPS** for these domains.
5. nginx on the VPS still does the final routing by `Host` header/`server_name` to the right `127.0.0.1:<port>` container, exactly like a normal reverse-proxy setup — that part (writing the site config) is unaffected by any of the above and can be done ahead of time.

**Known apex-domain wrinkle:** root/apex CNAMEs (e.g. bare `jamuin.co`, not a subdomain) get "ALIAS-flattened" by Niagahoster into a plain A record, which dalang.io's checker (looking for a literal CNAME) never recognizes as verified — this blocked `jamuin.co` going live via dalang.io. The documented fix is migrating that zone to Cloudflare (native root-CNAME support), not yet done as of last check. Subdomains (`www`, `workspace`, `finance`, …) don't hit this problem and verify normally.

See [[jamuin-infra-overview]] if that memory exists for the app/port map.