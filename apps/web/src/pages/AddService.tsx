import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { createDefaultMetricConfigs } from "../lib/metricConfigs";

export default function AddService() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [healthCheckPath, setHealthCheckPath] = useState("/");
  const [statusCodes, setStatusCodes] = useState("200");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || !domain.trim()) {
      setError("Name and domain are required.");
      return;
    }
    const expectedStatusCodes = statusCodes
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    setSaving(true);
    const { data: service, error: err } = await supabase
      .from("services")
      .insert({
        vps_id: id,
        name: name.trim(),
        domain: domain.trim(),
        health_check_path: healthCheckPath.trim() || "/",
        expected_status_codes: expectedStatusCodes.length ? expectedStatusCodes : [200],
      })
      .select()
      .single();

    if (err) {
      setSaving(false);
      setError(err.message);
      return;
    }

    try {
      await createDefaultMetricConfigs(service.id);
    } catch (e) {
      console.warn("[add service] failed to create default metric configs:", e);
    }

    setSaving(false);
    navigate(`/vps/${id}`);
  };

  const fieldStyle = { border: "2px solid #000", padding: 10, width: "100%", marginTop: 4 };

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h1 className="pixel-heading" style={{ fontSize: 16 }}>ADD SERVICE</h1>

      {error && <p style={{ fontWeight: 700 }}>{error}</p>}

      <label style={{ display: "block", marginTop: 16, fontWeight: 700, fontSize: 12 }}>
        NAME (e.g. jamuin-web)
        <input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label style={{ display: "block", marginTop: 16, fontWeight: 700, fontSize: 12 }}>
        DOMAIN (e.g. www.jamuin.co)
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
        }}
      >
        {saving ? "SAVING..." : "SAVE"}
      </button>
    </div>
  );
}
