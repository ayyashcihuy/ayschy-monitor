import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Check, Vps, VpsWithStatus } from "./types";

/**
 * Overview list: every active VPS + its latest external check. Reads
 * Supabase directly and subscribes to realtime changes on `checks` — never
 * touches any monitored VPS (see docs/vps-monitor-app-plan.md).
 */
export function useVpsOverview() {
  const [data, setData] = useState<VpsWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: vpsRows, error: vpsErr } = await supabase
      .from("vps")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (vpsErr) {
      setError(vpsErr.message);
      setLoading(false);
      return;
    }

    const withStatus: VpsWithStatus[] = await Promise.all(
      (vpsRows as Vps[]).map(async (v) => {
        const { data: checkRows } = await supabase
          .from("checks")
          .select("*")
          .eq("vps_id", v.id)
          .is("service_id", null)
          .eq("source", "external")
          .order("checked_at", { ascending: false })
          .limit(1);
        return { ...v, latestCheck: (checkRows?.[0] as Check | undefined) ?? null };
      }),
    );

    setData(withStatus);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("checks-overview")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "checks" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { data, loading, error, refresh: load };
}
