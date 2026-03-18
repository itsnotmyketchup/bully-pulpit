import PropTypes from "prop-types";

const TYPE_STYLES = {
  negotiation: { bg: "#378ADD22", border: "#378ADD66", accent: "#378ADD", icon: "⚖" },
  promise_warning: { bg: "#EF9F2722", border: "#EF9F2766", accent: "#EF9F27", icon: "⏳" },
  surrogate_done: { bg: "#1D9E7522", border: "#1D9E7566", accent: "#1D9E75", icon: "✓" },
  surrogate_fail: { bg: "#E24B4A22", border: "#E24B4A66", accent: "#E24B4A", icon: "✗" },
  election_warning: { bg: "#1a274422", border: "#1a274466", accent: "#1a2744", icon: "★" },
  fed_update: { bg: "#2563eb1f", border: "#2563eb66", accent: "#2563eb", icon: "◎" },
  appointment_success: { bg: "#1D9E7522", border: "#1D9E7566", accent: "#1D9E75", icon: "▲" },
  appointment_fail: { bg: "#E24B4A22", border: "#E24B4A66", accent: "#E24B4A", icon: "■" },
};

export default function NotificationBar({ notifications, onDismiss, onTabSwitch }) {
  if (!notifications.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
      {notifications.map(n => {
        const s = TYPE_STYLES[n.type] || TYPE_STYLES.surrogate_done;
        return (
          <div key={n.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: s.bg, border: `0.5px solid ${s.border}`,
            borderRadius: "var(--border-radius-md)", padding: "5px 10px",
            fontSize: 11,
          }}>
            <span style={{ color: s.accent, fontSize: 12, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{n.message}</span>
            {n.tab && (
              <button
                onClick={() => { onTabSwitch(n.tab); if (n.id !== "negotiation") onDismiss(n.id); }}
                style={{
                  padding: "2px 8px", fontSize: 10, fontWeight: 500, flexShrink: 0,
                  background: s.accent, color: "#fff", border: "none",
                  borderRadius: "var(--border-radius-md)", cursor: "pointer",
                }}
              >
                Go to {n.tab}
              </button>
            )}
            {n.id !== "negotiation" && (
              <button
                onClick={() => onDismiss(n.id)}
                style={{
                  padding: "2px 6px", fontSize: 11, flexShrink: 0,
                  background: "transparent", color: "var(--color-text-secondary)",
                  border: "none", cursor: "pointer", lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

NotificationBar.propTypes = {
  notifications: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    tab: PropTypes.string,
  })).isRequired,
  onDismiss: PropTypes.func.isRequired,
  onTabSwitch: PropTypes.func.isRequired,
};
