export default function SectionHeader({ label }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
      color: "var(--color-text-secondary)", marginTop: 10, marginBottom: 5,
      borderBottom: "1px solid var(--color-border-tertiary)", paddingBottom: 3,
    }}>
      {label}
    </div>
  );
}
