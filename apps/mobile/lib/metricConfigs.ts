import { supabase } from "./supabase";
import type { MetricType } from "./types";

export const METRIC_TYPES: MetricType[] = ["uptime", "response_time", "resource_usage", "traffic"];

export const METRIC_LABELS: Record<MetricType, string> = {
  uptime: "UPTIME",
  response_time: "RESPONSE TIME",
  resource_usage: "RESOURCE USAGE (CPU/MEM)",
  traffic: "TRAFFIC",
};

/** Sensible defaults for a freshly-created service — user can toggle any of these off. */
export const DEFAULT_METRIC_CONFIG: Record<MetricType, { enabled: boolean; interval_minutes: number }> = {
  uptime: { enabled: true, interval_minutes: 5 },
  response_time: { enabled: true, interval_minutes: 5 },
  resource_usage: { enabled: false, interval_minutes: 5 },
  traffic: { enabled: false, interval_minutes: 15 },
};

export async function createDefaultMetricConfigs(serviceId: string) {
  const rows = METRIC_TYPES.map((metric_type) => ({
    service_id: serviceId,
    metric_type,
    ...DEFAULT_METRIC_CONFIG[metric_type],
  }));
  const { error } = await supabase.from("service_metric_configs").insert(rows);
  if (error) throw error;
}
