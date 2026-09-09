import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { DEFAULT_METRIC_CONFIG, METRIC_LABELS, METRIC_TYPES } from "../lib/metricConfigs";
import type { MetricType, Service, ServiceMetricConfig } from "../lib/types";

export default function EditService() {
  const { id, serviceId } = useParams<{ id: string; serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [healthCheckPath, setHealthCheckPath] = useState("/");
  const [statusCodes, setStatusCodes] = useState("200");
  const [configs, setConfigs] = useState<Record<MetricType, ServiceMetricConfig>>(
    {} as Record<MetricType, ServiceMetricConfig>,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!serviceId) return;

    const { data: serviceRow } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .single();
    if (!serviceRow) return;

    setService(serviceRow as Service);
    setName(serviceRow.name);
    setDomain(serviceRow.domain);
    setHealthCheckPath(serviceRow.health_check_path);
    setStatusCodes((serviceRow.expected_status_codes as number[]).join(", "));

    const { data: configRows } = await supabase
      .from("service_metric_configs")
      .select("*")
      .eq("service_id", serviceId);

    const byType = {} as Record<MetricType, ServiceMetricConfig>;
    for (const metricType of METRIC_TYPES) {
      const existing = (configRows as ServiceMetricConfig[] | null)?.find(
        (c) => c.metric_type === metricType,
      );
      byType[metricType] = existing ?? {
        id: "",
        service_id: serviceId,
        metric_type: metricType,
        ...DEFAULT_METRIC_CONFIG[metricType],
      };
    }
    setConfigs(byType);
  }, [serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleMetric = (metricType: MetricType, enabled: boolean) => {
    setConfigs((prev) => ({ ...prev, [metricType]: { ...prev[metricType], enabled } }));
  };

  const save = async () => {
    if (!service) return;
    setSaving(true);
    setError(null);

    const expectedStatusCodes = statusCodes
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    const { error: serviceErr } = await supabase
      .from("services")
      .update({
        name: name.trim(),
        domain: domain.trim(),
        health_check_path: healthCheckPath.trim() || "/",
        expected_status_codes: expectedStatusCodes.length ? expectedStatusCodes : [200],
      })
      .eq("id", service.id);

    if (serviceErr) {
      setSaving(false);
      setError(serviceErr.message);
      return;
    }

    const { error: configErr } = await supabase.from("service_metric_configs").upsert(
      METRIC_TYPES.map((metricType) => ({
        service_id: service.id,
        metric_type: metricType,
        enabled: configs[metricType].enabled,
        interval_minutes: configs[metricType].interval_minutes,
      })),
      { onConflict: "service_id,metric_type" },
    );

    setSaving(false);
    if (configErr) {
      setError(`Saved service, but metric toggles failed: ${configErr.message}`);
      return;
    }
    navigate(`/vps/${id}`);
  };

  const remove = async () => {
    if (!service) return;
    if (!confirm(`Delete "${service.name}"? This also removes its check history.`)) return;
    const { error: err } = await supabase.from("services").delete().eq("id", service.id);
    if (err) {
      setError(err.message);
      return;
    }
    navigate(`/vps/${id}`);
  };

  if (!service) return <div style={{ padding: 24 }}>LOADING...</div>;

  const fieldStyle = { border: "2px solid #000", padding: 10, width: "100%", marginTop: 4 };

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h1 className="pixel-heading" style={{ fontSize: 16 }}>EDIT SERVICE</h1>

      {error && <p style={{ fontWeight: 700 }}>{error}</p>}

      <label style={{ display: "block", marginTop: 16, fontWeight: 700, fontSize: 12 }}>
        NAME
        <input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label style={{ display: "block", marginTop: 16, fontWeight: 700, fontSize: 12 }}>
        DOMAIN
        <input style={fieldStyle} value={domain} onChange={(e) => setDomain(e.target.value)} />
      </label>

      <label style={{ display: "block", marginTop: 16, fontWeight: 700, fontSize: 12 }}>
        HEALTH CHECK PATH
        <input
          style={fieldStyle}
          value={healthCheckPath}
          onChange={(e) => setHealthCheckPath(e.target.value)}
        />
      </label>

      <label style={{ display: "block", marginTop: 16, fontWeight: 700, fontSize: 12 }}>
        EXPECTED STATUS CODES (comma-separated)
        <input style={fieldStyle} value={statusCodes} onChange={(e) => setStatusCodes(e.target.value)} />
      </label>

      <h2 style={{ fontSize: 13, fontWeight: 900, marginTop: 24 }}>METRICS</h2>
      {METRIC_TYPES.map((metricType) => (
        <label
          key={metricType}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "2px solid #000",
            padding: 10,
            marginTop: 8,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {METRIC_LABELS[metricType]}
          <input
            type="checkbox"
            checked={configs[metricType]?.enabled ?? false}
            onChange={(e) => toggleMetric(metricType, e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
        </label>
      ))}

      <button
        onClick={save}
        disabled={saving}
        style={{
          marginTop: 24,
          border: "2px solid #000",
          background: "#000",
          color: "#fff",
          padding: "12px 20px",
          fontWeight: 900,
          cursor: "pointer",
          display: "block",
          width: "100%",
        }}
      >
        {saving ? "SAVING..." : "SAVE"}
      </button>

      <button
        onClick={remove}
        style={{
          marginTop: 12,
          border: "2px solid #000",
          background: "#fff",
          color: "#000",
          padding: "12px 20px",
          fontWeight: 900,
          cursor: "pointer",
          display: "block",
          width: "100%",
        }}
      >
        DELETE SERVICE
      </button>
    </div>
  );
}
