import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useVpsUptime } from "../lib/useVpsUptime";
import { getHealthState } from "../lib/health";
import { StatusBadge } from "../components/StatusBadge";
import { UptimeHeatmap } from "../components/UptimeHeatmap";
import type { Check, Incident, Service, Vps } from "../lib/types";

function formatPct(pct: number | null | undefined) {
  return pct == null ? "—" : `${pct}%`;
}

export default function VpsDetail() {
  const { id } = useParams<{ id: string }>();
  const [vps, setVps] = useState<Vps | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vpsCheck, setVpsCheck] = useState<Check | null>(null);
  const [serviceChecks, setServiceChecks] = useState<Record<string, Check | null>>({});
  const { summary: uptime } = useVpsUptime(id);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: vpsRow }, { data: serviceRows }, { data: incidentRows }, { data: vpsCheckRows }] =
      await Promise.all([
        supabase.from("vps").select("*").eq("id", id).single(),
        supabase.from("services").select("*").eq("vps_id", id).order("name"),
        supabase
          .from("incidents")
          .select("*")
          .eq("vps_id", id)
          .order("started_at", { ascending: false })
          .limit(20),
        supabase
          .from("checks")
          .select("*")
          .eq("vps_id", id)
          .is("service_id", null)
          .eq("source", "external")
          .order("checked_at", { ascending: false })
          .limit(1),
      ]);
    setVps(vpsRow as Vps);
    const loadedServices = (serviceRows as Service[]) ?? [];
    setServices(loadedServices);
    setIncidents((incidentRows as Incident[]) ?? []);
    setVpsCheck((vpsCheckRows?.[0] as Check | undefined) ?? null);

    const checksByService = await Promise.all(
      loadedServices.map(async (s) => {
        const { data } = await supabase
          .from("checks")
          .select("*")
          .eq("service_id", s.id)
          .eq("source", "external")
          .order("checked_at", { ascending: false })
          .limit(1);
        return [s.id, (data?.[0] as Check | undefined) ?? null] as const;
      }),
    );
    setServiceChecks(Object.fromEntries(checksByService));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!vps) return <div style={{ padding: 24 }}>LOADING...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ border: "2px solid #000", padding: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="pixel-heading" style={{ fontSize: 16 }}>{vps.label}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{vps.primary_domain ?? vps.name}</div>
          </div>
          <StatusBadge state={getHealthState(vpsCheck)} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 12, marginTop: 12 }}>
          24H: {formatPct(uptime?.uptime_24h)} &nbsp;&nbsp; 7D: {formatPct(uptime?.uptime_7d)}
        </div>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 900 }}>UPTIME (LAST 12 WEEKS)</h2>
      <div style={{ marginBottom: 24 }}>
        <UptimeHeatmap daily={uptime?.daily ?? []} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 14, fontWeight: 900 }}>SERVICES</h2>
        <Link
          to={`/vps/${id}/service/new`}
          style={{ border: "2px solid #000", padding: "6px 10px", fontWeight: 900, fontSize: 12 }}
        >
          + ADD SERVICE
        </Link>
      </div>
      {services.length === 0 && <p>NO SERVICES YET.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {services.map((s) => (
          <Link
            key={s.id}
            to={`/vps/${id}/service/${s.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              border: "2px solid #000",
              padding: 12,
              color: "#000",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 12 }}>{s.domain}{s.health_check_path}</div>
            </div>
            <StatusBadge state={getHealthState(serviceChecks[s.id])} />
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 900 }}>INCIDENT HISTORY</h2>
      {incidents.length === 0 && <p>NO INCIDENTS RECORDED.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {incidents.map((i) => (
          <div key={i.id} style={{ border: "2px solid #000", padding: 12 }}>
            <div>
              {new Date(i.started_at).toLocaleString()}
              {i.ended_at ? ` → ${new Date(i.ended_at).toLocaleString()}` : " (ONGOING)"}
            </div>
            <div style={{ fontSize: 12 }}>
              {i.duration_minutes != null ? `${i.duration_minutes} min downtime` : "still down"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
