export default function LogTab({ log }) {
  if (log.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", padding: 12, textAlign: "center" }}>
        No events yet.
      </div>
    );
  }
  return (
    <div>
      {log.map((e, i) => (
        <div key={i} style={{ padding: "3px 0", borderBottom: i < log.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
          <span style={{ fontSize: 9, color: "var(--color-text-secondary)", marginRight: 4 }}>
            Y{Math.ceil(e.week / 52)}W{((e.week - 1) % 52) + 1}
          </span>
          <span style={{ fontSize: 11, color: "var(--color-text-primary)" }}>{e.text}</span>
        </div>
      ))}
    </div>
  );
}
