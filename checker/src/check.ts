/**
 * jamuin-monitor external checker.
 *
 * Runs on GitHub Actions on a schedule (never on any monitored VPS — see
 * ../../docs/vps-monitor-app-plan.md, "Constraint Arsitektur Kunci"). This
 * script is the single source of truth for uptime/downtime: it curls every
 * registered VPS and service over the public internet exactly the way a real
 * user would, writes each result to Supabase, and fires an Expo push +
 * opens/closes an incident row whenever a target flips up<->down.
 */
import { createClient } from "@supabase/supabase-js";
import { sendExpoPush } from "./push.js";
import type { CheckStatus, CheckTarget, Service, Vps } from "./types.js";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = requireEnv("SUPABASE_SERVICE_KEY");
const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN; // optional
const CHECK_TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS ?? 10000);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[check] missing required env var ${name}`);
    process.exit(1);
  }
  return value;
}

async function loadTargets(): Promise<CheckTarget[]> {
  const { data: vpsRows, error: vpsErr } = await supabase
    .from("vps")
    .select("id, name, label, primary_domain, is_active")
    .eq("is_active", true);
  if (vpsErr) throw vpsErr;

  const { data: serviceRows, error: svcErr } = await supabase
    .from("services")
    .select("id, vps_id, name, domain, health_check_path, expected_status_codes, is_active")
    .eq("is_active", true);
  if (svcErr) throw svcErr;

  const targets: CheckTarget[] = [];

  for (const v of (vpsRows ?? []) as Vps[]) {
    if (v.primary_domain) {
      targets.push({
        vpsId: v.id,
        serviceId: null,
        url: `https://${v.primary_domain}/`,
        expectedStatusCodes: [200],
        label: `vps:${v.name}`,
      });
    }
  }

  for (const s of (serviceRows ?? []) as Service[]) {
    targets.push({
      vpsId: s.vps_id,
      serviceId: s.id,
      url: `https://${s.domain}${s.health_check_path}`,
      expectedStatusCodes: s.expected_status_codes?.length ? s.expected_status_codes : [200],
      label: `service:${s.name}`,
    });
  }

  return targets;
}

async function probe(
  target: CheckTarget,
): Promise<{ status: CheckStatus; httpCode: number | null; latencyMs: number }> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    const res = await fetch(target.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    const status: CheckStatus = target.expectedStatusCodes.includes(res.status) ? "up" : "down";
    return { status, httpCode: res.status, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - started;
    console.warn(`[check] ${target.label} (${target.url}) failed: ${(err as Error).message}`);
    return { status: "down", httpCode: null, latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}

/** Last known status for a target, from the checks table (before this run). */
async function getPreviousStatus(target: CheckTarget): Promise<CheckStatus | null> {
  const query = supabase
    .from("checks")
    .select("status")
    .eq("source", "external")
    .eq("vps_id", target.vpsId)
    .order("checked_at", { ascending: false })
    .limit(1);

  const { data, error } = target.serviceId
    ? await query.eq("service_id", target.serviceId)
    : await query.is("service_id", null);

  if (error) throw error;
  return (data?.[0]?.status as CheckStatus | undefined) ?? null;
}

async function recordCheck(
  target: CheckTarget,
  result: { status: CheckStatus; httpCode: number | null; latencyMs: number },
) {
  const { error } = await supabase.from("checks").insert({
    vps_id: target.vpsId,
    service_id: target.serviceId,
    source: "external",
    status: result.status,
    http_code: result.httpCode,
    latency_ms: result.latencyMs,
  });
  if (error) throw error;
}

async function openIncident(target: CheckTarget) {
  const { error } = await supabase.from("incidents").insert({
    vps_id: target.vpsId,
    service_id: target.serviceId,
    started_at: new Date().toISOString(),
    detected_by: "external",
  });
  if (error) throw error;
}

async function closeOpenIncident(target: CheckTarget) {
  const query = supabase
    .from("incidents")
    .update({ ended_at: new Date().toISOString() })
    .eq("vps_id", target.vpsId)
    .is("ended_at", null);

  const { error } = target.serviceId
    ? await query.eq("service_id", target.serviceId)
    : await query.is("service_id", null);
  if (error) throw error;
}

async function notifyStatusChange(target: CheckTarget, newStatus: CheckStatus) {
  const { data: tokenRows, error } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token");
  if (error) throw error;

  const tokens = (tokenRows ?? []).map((r) => r.expo_push_token as string);
  const title = newStatus === "down" ? "🔴 Down" : "🟢 Recovered";
  await sendExpoPush(tokens, title, `${target.label} is now ${newStatus}`, EXPO_ACCESS_TOKEN);
}

async function main() {
  const targets = await loadTargets();
  console.log(`[check] checking ${targets.length} target(s)`);

  const results = await Promise.allSettled(
    targets.map(async (target) => {
      const [previousStatus, result] = await Promise.all([
        getPreviousStatus(target),
        probe(target),
      ]);

      await recordCheck(target, result);

      const changed = previousStatus !== null && previousStatus !== result.status;
      if (changed) {
        if (result.status === "down") {
          await openIncident(target);
        } else {
          await closeOpenIncident(target);
        }
        await notifyStatusChange(target, result.status);
      }

      console.log(
        `[check] ${target.label}: ${result.status} (http=${result.httpCode ?? "-"}, ${result.latencyMs}ms)${changed ? " [CHANGED]" : ""}`,
      );
    }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    for (const f of failed) console.error(f.reason);
    process.exit(1);
  }
}

main();
