import { Link } from "react-router-dom";
import { useVpsOverview } from "../lib/useVpsOverview";
import { getHealthState } from "../lib/health";
import { StatusBadge } from "../components/StatusBadge";

export default function VpsList() {
  const { data, loading, error } = useVpsOverview();

  return (
    <div style={{ padding: 24 }}>
      <h1 className="pixel-heading" style={{ fontSize: 20 }}>
        JAMUIN MONITOR
      </h1>

      {error && <p style={{ fontWeight: 700 }}>ERROR: {error}</p>}
      {loading && data.length === 0 && <p>LOADING...</p>}

      {!loading && data.length === 0 && !error && (
        <p>NO VPS REGISTERED YET. TAP + ADD VPS BELOW TO START.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {data.map((v) => (
          <Link
            key={v.id}
            to={`/vps/${v.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              border: "2px solid #000",
              padding: 16,
              background: "#fff",
              color: "#000",
            }}
          >
            <span style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{v.label}</div>
              <div style={{ fontSize: 12 }}>{v.primary_domain ?? v.name}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>
                {v.uptime24h == null ? "24H: —" : `24H: ${v.uptime24h}%`}
              </div>
            </span>
            <StatusBadge state={getHealthState(v.latestCheck)} />
          </Link>
        ))}
      </div>

      <Link
        to="/vps/new"
        style={{
          display: "inline-block",
          marginTop: 24,
          border: "2px solid #000",
          background: "#000",
          color: "#fff",
          padding: "12px 20px",
          fontWeight: 900,
        }}
      >
        + ADD VPS
      </Link>
    </div>
  );
}
