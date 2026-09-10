import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { VpsUptimeSummary } from "./types";

const HEATMAP_DAYS = 84; // 12 weeks, GitHub-contribution-grid style

export function useVpsUptime(vpsId: string | undefined) {
  const [summary, setSummary] = useState<VpsUptimeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vpsId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("vps_uptime_summary", {
      p_vps_id: vpsId,
      p_days: HEATMAP_DAYS,
    });
    if (error) {
      console.warn("[uptime] failed to load summary:", error.message);
      setSummary(null);
    } else {
      setSummary(data as VpsUptimeSummary);
    }
    setLoading(false);
  }, [vpsId]);

  useEffect(() => {
    load();
  }, [load]);

  return { summary, loading, refresh: load };
}
