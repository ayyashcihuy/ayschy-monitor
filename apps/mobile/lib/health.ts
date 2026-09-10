import type { Check } from "./types";

export type HealthState = "up" | "warning" | "down" | "unknown";

// No per-service/VPS threshold configured yet (v1 — could become a
// service_metric_configs column later). One shared constant for now: a
// target that's reachable (expected status code) but slower than this
// shows as "warning" instead of a clean "up".
export const WARNING_LATENCY_MS = 1500;

export function getHealthState(check: Check | null | undefined): HealthState {
  if (!check) return "unknown";
  if (check.status === "down") return "down";
  if (check.latency_ms != null && check.latency_ms > WARNING_LATENCY_MS) return "warning";
  return "up";
}

export const HEALTH_ICON: Record<HealthState, string> = {
  up: "O",
  warning: "!",
  down: "X",
  unknown: "?",
};

export const HEALTH_LABEL: Record<HealthState, string> = {
  up: "UP",
  warning: "WARNING",
  down: "DOWN",
  unknown: "NO DATA",
};
