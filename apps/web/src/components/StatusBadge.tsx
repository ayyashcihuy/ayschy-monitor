import { HEALTH_ICON, type HealthState } from "../lib/health";

const SIZE = 28;

/**
 * Small B&W status box — O (up), ! (warning: up but slow), X (down),
 * ? (no data yet). Kept strictly black/white per the shared pixelated
 * style: states differ by icon + border weight/style, never by hue.
 */
export function StatusBadge({ state }: { state: HealthState }) {
  const isDown = state === "down";
  const isWarning = state === "warning";
  const isUnknown = state === "unknown";

  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        flexShrink: 0,
        border: isWarning ? "4px solid #000" : "2px solid #000",
        borderStyle: isUnknown ? "dashed" : "solid",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isDown ? "#000" : "#fff",
        color: isDown ? "#fff" : "#000",
        fontWeight: 900,
        fontSize: 14,
      }}
    >
      {HEALTH_ICON[state]}
    </div>
  );
}
