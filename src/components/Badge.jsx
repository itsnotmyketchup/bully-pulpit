export default function Badge({ children, color }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 9px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 500,
      background: color + "22",
      color,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}
