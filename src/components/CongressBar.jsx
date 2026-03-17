import { FACTION_DATA } from "../data/factions.js";

const FACTION_ORDER = ["prog", "mod_dem", "blue_dog", "mod_rep", "trad_con", "freedom"];

export default function CongressBar({ factions, chamber, hoveredFaction, setHoveredFaction }) {
  const seatKey = chamber === "Senate" ? "senateSeats" : "houseSeats";
  const majority = chamber === "Senate" ? 51 : 218;
  const total = chamber === "Senate" ? 100 : 435;

  const ordered = FACTION_ORDER
    .map(id => factions.find(f => f.id === id))
    .filter(Boolean);

  const segments = ordered.map(f => ({
    faction: f,
    seats: f[seatKey],
    pct: (f[seatKey] / total) * 100,
  }));

  const majorityPct = (majority / total) * 100;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)" }}>{chamber}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{total} seats</span>
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        {/* Bar */}
        <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)" }}>
          {segments.map(({ faction: f, seats, pct }) => (
            <div
              key={f.id}
              onMouseEnter={() => setHoveredFaction(f.id)}
              onMouseLeave={() => setHoveredFaction(null)}
              style={{
                width: `${pct}%`,
                background: f.color,
                opacity: hoveredFaction && hoveredFaction !== f.id ? 0.4 : 1,
                transition: "opacity 0.15s",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: pct > 4 ? undefined : 2,
              }}
            >
              {pct > 8 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                  {seats}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Majority marker */}
        <div style={{
          position: "absolute",
          left: `${majorityPct}%`,
          top: -4,
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "6px solid var(--color-text-primary)",
          }} />
          <div style={{
            width: 1.5,
            height: 36,
            background: "var(--color-text-primary)",
            opacity: 0.5,
          }} />
        </div>
        <div style={{
          position: "absolute",
          left: `${majorityPct}%`,
          top: -16,
          transform: "translateX(-50%)",
          fontSize: 9,
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          {majority}
        </div>
      </div>
    </div>
  );
}
