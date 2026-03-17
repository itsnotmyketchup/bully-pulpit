export default function DualMeter({ trust, relationship, color }) {
  return (
    <div>
      {[["Rel", relationship, color], ["Trust", trust, trust > 60 ? "#1D9E75" : trust > 35 ? "#EF9F27" : "#E24B4A"]].map(([label, value, c]) => (
        <div key={label} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 1 }}>
          <span style={{ fontSize: 10, color: "var(--color-text-secondary)", width: 32, flexShrink: 0 }}>{label}</span>
          <div style={{ flex: 1, height: 4, background: "var(--color-background-tertiary)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${value}%`, background: c, borderRadius: 2, transition: "width 0.4s" }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 500, width: 22, textAlign: "right", color: "var(--color-text-primary)" }}>{Math.round(value)}</span>
        </div>
      ))}
    </div>
  );
}
