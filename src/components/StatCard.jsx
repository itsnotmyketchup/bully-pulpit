import { SM } from "../data/stats.js";
import MiniChart from "./MiniChart.jsx";

export default function StatCard({ statKey, value, history, prevValue }) {
  const m = SM[statKey];
  if (!m) return null;
  const d = value - prevValue;
  const up = d > 0.005, dn = d < -0.005;
  const good = (m.g === "up" && up) || (m.g === "down" && dn);
  const bad = (m.g === "up" && dn) || (m.g === "down" && up);

  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", minWidth: 0 }}>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.l}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 4 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 500, color: "var(--color-text-primary)" }}>{m.f(value)}</div>
          {(up || dn) && (
            <div style={{ fontSize: 9, color: good ? "#1D9E75" : bad ? "#E24B4A" : "var(--color-text-secondary)" }}>
              {up ? "+" : ""}{d.toFixed(2)}
            </div>
          )}
        </div>
        <MiniChart data={history} color={good ? "#1D9E75" : bad ? "#E24B4A" : "#888"} />
      </div>
    </div>
  );
}
