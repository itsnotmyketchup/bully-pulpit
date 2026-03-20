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
    <div style={{ background: "var(--color-background-tertiary)", borderRadius: "12px", padding: "10px 12px", minWidth: 0, border: "1px solid var(--color-border-tertiary)", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4, lineHeight: 1.3 }}>{m.l}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.1 }}>{m.f(value)}</div>
          {(up || dn) && (
            <div style={{ fontSize: 9, marginTop: 4, color: good ? "#1D9E75" : bad ? "#E24B4A" : "var(--color-text-secondary)" }}>
              {up ? "+" : ""}{d.toFixed(2)}
            </div>
          )}
        </div>
        <div style={{ flex: "0 0 auto", opacity: 0.95 }}>
          <MiniChart data={history} color={good ? "#1D9E75" : bad ? "#E24B4A" : "#888"} h={34} w={78} />
        </div>
      </div>
    </div>
  );
}
