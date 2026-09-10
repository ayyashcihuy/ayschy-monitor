// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

/**
 * jamuin-monitor external checker — Supabase Edge Function.
 *
 * Runs on Supabase's infra, invoked on a schedule by Database → Cron Jobs
 * (pg_cron), NOT on any monitored VPS — see docs/vps-monitor-app-plan.md,
 * "Constraint Arsitektur Kunci". This is the single source of truth for
 * uptime/downtime: it curls every registered VPS/service over the public
 * internet exactly the way a real user would, writes each result to
 * Supabase, and fires an Expo push + opens/closes an incident row whenever
 * a target flips up<->down.
 *
 * This mirrors checker/src/check.ts (the original GitHub Actions version,
 * kept in the repo for local testing/debugging — see checker/README.md).
 * Keep both in sync if the logic changes.
 */

type CheckStatus = "up" | "down";

interface Vps {
  id: string;
  name: string;
  primary_domain: string | null;
}

interface Service {
  id: string;
  vps_id: string;
  name: string;
  domain: string;
  health_check_path: string;
  expected_status_codes: number[];
}

interface CheckTarget {
  vpsId: string;
  serviceId: string | null;
  url: string;
  expectedStatusCodes: number[];
  label: string;
}

const CHECK_TIMEOUT_MS = Number(Deno.env.get("CHECK_TIMEOUT_MS") ?? 10000);
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN") ?? undefined;

async function sendExpoPush(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({ to, title, body, sound: "default", priority: "high" }));
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error(`[push] Expo push API returned ${res.status}: ${await res.text()}`);
  }
}

// deno-lint-ignore no-explicit-any
async function loadTargets(supabaseAdmin: any): Promise<CheckTarget[]> {
  const { data: vpsRows, error: vpsErr } = await supabaseAdmin
    .from("vps")
    .select("id, name, primary_domain")
    .eq("is_active", true);
  if (vpsErr) throw vpsErr;

  const { data: serviceRows, error: svcErr } = await supabaseAdmin
    .from("services")
    .select("id, vps_id, name, domain, health_check_path, expected_status_codes")
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
    const res = await fetch(target.url, { method: "GET", redirect: "follow", signal: controller.signal });
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

// deno-lint-ignore no-explicit-any
async function getPreviousStatus(supabaseAdmin: any, target: CheckTarget): Promise<CheckStatus | null> {
  const query = supabaseAdmin
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
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  target: CheckTarget,
  result: { status: CheckStatus; httpCode: number | null; latencyMs: number },
) {
  const { error } = await supabaseAdmin.from("checks").insert({
    vps_id: target.vpsId,
    service_id: target.serviceId,
    source: "external",
    status: result.status,
    http_code: result.httpCode,
    latency_ms: result.latencyMs,
  });
  if (error) throw error;
}

// deno-lint-ignore no-explicit-any
async function openIncident(supabaseAdmin: any, target: CheckTarget) {
  const { error } = await supabaseAdmin.from("incidents").insert({
    vps_id: target.vpsId,
    service_id: target.serviceId,
    started_at: new Date().toISOString(),
    detected_by: "external",
  });
  if (error) throw error;
}

// deno-lint-ignore no-explicit-any
async function closeOpenIncident(supabaseAdmin: any, target: CheckTarget) {
  const query = supabaseAdmin
    .from("incidents")
    .update({ ended_at: new Date().toISOString() })
    .eq("vps_id", target.vpsId)
    .is("ended_at", null);

  const { error } = target.serviceId
    ? await query.eq("service_id", target.serviceId)
    : await query.is("service_id", null);
  if (error) throw error;
}

// deno-lint-ignore no-explicit-any
async function notifyStatusChange(supabaseAdmin: any, target: CheckTarget, newStatus: CheckStatus) {
  const { data: tokenRows, error } = await supabaseAdmin.from("device_push_tokens").select("expo_push_token");
  if (error) throw error;

  const tokens = (tokenRows ?? []).map((r: { expo_push_token: string }) => r.expo_push_token);
  const title = newStatus === "down" ? "🔴 Down" : "🟢 Recovered";
  await sendExpoPush(tokens, title, `${target.label} is now ${newStatus}`);
}

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const supabaseAdmin = ctx.supabaseAdmin;

    const targets = await loadTargets(supabaseAdmin);
    console.log(`[check] checking ${targets.length} target(s)`);

    const results = await Promise.allSettled(
      targets.map(async (target) => {
        const [previousStatus, result] = await Promise.all([
          getPreviousStatus(supabaseAdmin, target),
          probe(target),
        ]);

        await recordCheck(supabaseAdmin, target, result);

        const changed = previousStatus !== null && previousStatus !== result.status;
        if (changed) {
          if (result.status === "down") {
            await openIncident(supabaseAdmin, target);
          } else {
            await closeOpenIncident(supabaseAdmin, target);
          }
          await notifyStatusChange(supabaseAdmin, target, result.status);
        }

        console.log(
          `[check] ${target.label}: ${result.status} (http=${result.httpCode ?? "-"}, ${result.latencyMs}ms)${changed ? " [CHANGED]" : ""}`,
        );
        return { label: target.label, status: result.status, changed };
      }),
    );

    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    for (const f of failed) console.error(f.reason);

    return Response.json({
      checked: targets.length,
      failed: failed.length,
      results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) })),
    });
  }),
};

/* To invoke manually (e.g. to test outside the cron schedule):

  curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/checker' \
    --header 'apiKey: <service_role/secret key>'

  Locally (after `supabase start`):

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/checker' \
    --header 'apiKey: <local service_role key from `supabase status`>'
*/
