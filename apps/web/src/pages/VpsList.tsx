import { Link } from "react-router-dom";
import { useVpsOverview } from "../lib/useVpsOverview";

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
        {data.map((v) => {
          const status = v.latestCheck?.status ?? null;
          const isDown = status === "down";
          return (
            <Link
              key={v.id}
              to={`/vps/${v.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                border: "2px solid #000",
                padding: 16,
                background: isDown ? "#000" : "#fff",
                color: isDown ? "#fff" : "#000",
              }}
            >
              <strong style={{ minWidth: 56 }}>{status === null ? "?" : isDown ? "DOWN" : "UP"}</strong>
              <span>
                <div style={{ fontWeight: 700 }}>{v.label}</div>
                <div style={{ fontSize: 12 }}>{v.primary_domain ?? v.name}</div>
              </span>
            </Link>
          );
        })}
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
