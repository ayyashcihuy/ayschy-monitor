// Mirrors supabase/migrations/0001_init.sql — kept in sync manually with
// apps/mobile/lib/types.ts until this becomes a shared package.

export interface Vps {
  id: string;
  name: string;
  label: string;
  primary_domain: string | null;
  provider: string | null;
  renewal_date: string | null;
  monthly_cost: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  vps_id: string;
  name: string;
  domain: string;
  health_check_path: string;
  expected_status_codes: number[];
  is_active: boolean;
  created_at: string;
}

export type MetricType = "uptime" | "response_time" | "resource_usage" | "traffic";

export interface ServiceMetricConfig {
  id: string;
  service_id: string;
  metric_type: MetricType;
  enabled: boolean;
  interval_minutes: number;
}

export type CheckSource = "external" | "internal_agent";
export type CheckStatus = "up" | "down";

export interface Check {
  id: string;
  vps_id: string;
  service_id: string | null;
  source: CheckSource;
  status: CheckStatus;
  http_code: number | null;
  latency_ms: number | null;
  checked_at: string;
}

export interface Incident {
  id: string;
  vps_id: string;
  service_id: string | null;
  started_at: string;
  ended_at: string | null;
  detected_by: CheckSource;
  duration_minutes: number | null;
}

export interface VpsWithStatus extends Vps {
  latestCheck: Check | null;
  uptime24h: number | null;
}

/** One day's aggregate for the heatmap grid — see vps_uptime_summary() in supabase/migrations. */
export interface DailyUptimeEntry {
  day: string; // YYYY-MM-DD
  status: CheckStatus;
}

export interface VpsUptimeSummary {
  uptime_24h: number | null;
  uptime_7d: number | null;
  daily: DailyUptimeEntry[];
}
