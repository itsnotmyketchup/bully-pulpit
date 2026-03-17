export default function DualMeter({ trust, relationship, color, unity }) {
  const trustColor = trust > 60 ? "#1D9E75" : trust > 35 ? "#EF9F27" : "#E24B4A";
  const unityColor = unity !== undefined
    ? (unity > 60 ? "#1D9E75" : unity > 40 ? "#EF9F27" : "#E24B4A")
    : null;

  const metrics = [
    ["Rel", relationship, color],
    ["Trust", trust, trustColor],
    ...(unity !== undefined ? [["Unity", unity, unityColor]] : []),
  ];

  return (
    <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
      {metrics.map(([label, value, c]) => (
        <div key={label} style={{
          flex: 1,
          background: `${c}18`,
          borderRadius: 5,
          padding: "4px 7px",
          border: `0.5px solid ${c}40`,
        }}>
          <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 1 }}>{label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: c, lineHeight: 1 }}>{Math.round(value)}</div>
        </div>
      ))}
    </div>
  );
}
