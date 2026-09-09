export type CheckSource = "external" | "internal_agent";
export type CheckStatus = "up" | "down";

export interface Vps {
  id: string;
  name: string;
  label: string;
  primary_domain: string | null;
  is_active: boolean;
}

export interface Service {
  id: string;
  vps_id: string;
  name: string;
  domain: string;
  health_check_path: string;
  expected_status_codes: number[];
  is_active: boolean;
}

/** One target to curl: either a bare VPS (primary_domain) or a service under it. */
export interface CheckTarget {
  vpsId: string;
  serviceId: string | null;
  url: string;
  expectedStatusCodes: number[];
  label: string; // for logging only
}
