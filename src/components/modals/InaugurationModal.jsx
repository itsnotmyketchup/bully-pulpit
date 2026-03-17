import { ALLIED_FACTIONS } from "../../data/constants.js";

export default function InaugurationModal({ results, onDismiss }) {
  if (!results) return null;

  const { yr, pp, houseNetChange, senateNetChange, factionBreakdown } = results;
  const allyFactions = factionBreakdown ? factionBreakdown.filter(f => f.party === pp) : [];
  const allyHouseTotal = allyFactions.reduce((s, f) => s + f.newHouse, 0);
  const allySenateTotal = allyFactions.reduce((s, f) => s + f.newSenate, 0);
  const houseGain = houseNetChange >= 0;
  const senateGain = senateNetChange >= 0;
  const majority = allyHouseTotal > 217;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1010, padding: 16,
    }}>
      <div style={{
        background: "#FAFAF6",
        borderRadius: 4, maxWidth: 380, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px #c8b49a",
        color: "#1a1208",
      }}>
        {/* Header */}
        <div style={{ background: "#1a2744", padding: "14px 20px 12px", borderRadius: "4px 4px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.25)" }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Capitol Hill · Washington D.C.
            </span>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.25)" }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 8, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Congressional Inauguration
          </div>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1208", marginBottom: 4 }}>
              New Congress Sworn In
            </div>
            <div style={{ fontSize: 10, color: "#7a6040" }}>
              Year {yr + 1} — {majority ? "Majority" : "Minority"} Government
            </div>
          </div>

          {/* Seat change summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div style={{
              padding: "8px 10px", borderRadius: 3, textAlign: "center",
              background: houseGain ? "#d4eedd" : "#f8d7d7",
            }}>
              <div style={{ fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em", color: houseGain ? "#2d6a3f" : "#8b1a1a", marginBottom: 3 }}>House</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: houseGain ? "#2d6a3f" : "#8b1a1a" }}>
                {houseGain ? "+" : ""}{houseNetChange}
              </div>
              <div style={{ fontSize: 9, color: houseGain ? "#2d6a3f" : "#8b1a1a", marginTop: 1 }}>{allyHouseTotal} seats held</div>
            </div>
            <div style={{
              padding: "8px 10px", borderRadius: 3, textAlign: "center",
              background: senateGain ? "#d4eedd" : "#f8d7d7",
            }}>
              <div style={{ fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em", color: senateGain ? "#2d6a3f" : "#8b1a1a", marginBottom: 3 }}>Senate</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: senateGain ? "#2d6a3f" : "#8b1a1a" }}>
                {senateGain ? "+" : ""}{senateNetChange}
              </div>
              <div style={{ fontSize: 9, color: senateGain ? "#2d6a3f" : "#8b1a1a", marginTop: 1 }}>{allySenateTotal} seats held</div>
            </div>
          </div>

          {/* Majority status note */}
          <div style={{
            padding: "7px 10px", marginBottom: 14,
            background: majority ? "#d4eedd" : "#fff3cd",
            borderRadius: 3, fontSize: 10,
            color: majority ? "#2d6a3f" : "#856404",
            textAlign: "center",
          }}>
            {majority
              ? `Your party holds a House majority — legislation will proceed normally.`
              : `Your party is in the minority — expect harder legislative battles ahead.`}
          </div>

          <button
            onClick={onDismiss}
            style={{
              width: "100%", padding: "10px 0", fontSize: 12, fontWeight: 600,
              background: "#1a2744", color: "#fff",
              border: "none", borderRadius: 3, cursor: "pointer", letterSpacing: "0.03em",
            }}
          >
            Convene the New Congress
          </button>
        </div>
      </div>
    </div>
  );
}
