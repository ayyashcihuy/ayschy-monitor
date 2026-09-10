import { buildDayGrid, toWeekColumns, type DayCellStatus } from "../lib/heatmap";
import type { DailyUptimeEntry } from "../lib/types";

const CELL_SIZE = 12;
const CELL_GAP = 2;
const DAYS = 84; // 12 weeks

export function UptimeHeatmap({ daily }: { daily: DailyUptimeEntry[] }) {
  const columns = toWeekColumns(buildDayGrid(daily, DAYS));

  return (
    <div>
      <div style={{ display: "flex", gap: CELL_GAP, overflowX: "auto", paddingBottom: 4 }}>
        {columns.map((col, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: CELL_GAP }}>
            {col.map((cell) => (
              <Cell key={cell.date} status={cell.status} title={cell.date} />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, flexWrap: "wrap", fontSize: 10 }}>
        <Cell status="up" />
        <span style={{ marginRight: 8 }}>UP ALL DAY</span>
        <Cell status="down" />
        <span style={{ marginRight: 8 }}>HAD DOWNTIME</span>
        <Cell status="no-data" />
        <span>NO DATA</span>
      </div>
    </div>
  );
}

function Cell({ status, title }: { status: DayCellStatus; title?: string }) {
  return (
    <div
      title={title}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        border: "1px solid #000",
        borderStyle: status === "no-data" ? "dashed" : "solid",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {status === "up" && <div style={{ width: "100%", height: "100%", background: "#000" }} />}
      {status === "down" && <div style={{ width: "45%", height: "45%", background: "#000" }} />}
    </div>
  );
}
