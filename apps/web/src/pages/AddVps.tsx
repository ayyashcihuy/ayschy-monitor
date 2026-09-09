import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AddVps() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [primaryDomain, setPrimaryDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || !label.trim()) {
      setError("Name and label are required.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.from("vps").insert({
      name: name.trim(),
      label: label.trim(),
      primary_domain: primaryDomain.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/");
  };

  const fieldStyle = { border: "2px solid #000", padding: 10, width: "100%", marginTop: 4 };

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h1 className="pixel-heading" style={{ fontSize: 16 }}>ADD VPS</h1>

      {error && <p style={{ fontWeight: 700 }}>{error}</p>}

      <label style={{ display: "block", marginTop: 16, fontWeight: 700, fontSize: 12 }}>
        NAME (unique, e.g. vps-5bd9f069)
        <input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label style={{ display: "block", marginTop: 16, fontWeight: 700, fontSize: 12 }}>
        LABEL (display name)
        <input style={fieldStyle} value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>

      <label style={{ display: "block", marginTop: 16, fontWeight: 700, fontSize: 12 }}>
        PRIMARY DOMAIN (used by the external checker)
        <input
          style={fieldStyle}
          value={primaryDomain}
          onChange={(e) => setPrimaryDomain(e.target.value)}
          placeholder="e.g. www.jamuin.co"
        />
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
