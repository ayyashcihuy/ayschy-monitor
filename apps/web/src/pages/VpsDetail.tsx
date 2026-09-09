import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Incident, Service, Vps } from "../lib/types";

export default function VpsDetail() {
  const { id } = useParams<{ id: string }>();
  const [vps, setVps] = useState<Vps | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: vpsRow }, { data: serviceRows }, { data: incidentRows }] = await Promise.all([
        supabase.from("vps").select("*").eq("id", id).single(),
        supabase.from("services").select("*").eq("vps_id", id).order("name"),
        supabase
          .from("incidents")
          .select("*")
          .eq("vps_id", id)
          .order("started_at", { ascending: false })
          .limit(20),
      ]);
      setVps(vpsRow as Vps);
      setServices((serviceRows as Service[]) ?? []);
      setIncidents((incidentRows as Incident[]) ?? []);
    })();
  }, [id]);

  if (!vps) return <div style={{ padding: 24 }}>LOADING...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ border: "2px solid #000", padding: 16, marginBottom: 24 }}>
        <div className="pixel-heading" style={{ fontSize: 16 }}>{vps.label}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{vps.primary_domain ?? vps.name}</div>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 900 }}>SERVICES</h2>
      {services.length === 0 && <p>NO SERVICES YET.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {services.map((s) => (
          <div key={s.id} style={{ border: "2px solid #000", padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            <div style={{ fontSize: 12 }}>{s.domain}{s.health_check_path}</div>
          </div>
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
