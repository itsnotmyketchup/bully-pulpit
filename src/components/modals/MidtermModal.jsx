import { useState, useEffect } from "react";

const PARTY_COLORS = { DEM: "#3b7dd8", REP: "#c0392b" };
const PARTY_NAMES = { DEM: "Democrats", REP: "Republicans" };

function ViewToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: 2 }}>
      {["faction", "party"].map(v => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: "3px 10px", fontSize: 9, fontWeight: value === v ? 600 : 400,
          background: value === v ? "rgba(255,255,255,0.15)" : "transparent",
          color: value === v ? "#fff" : "rgba(255,255,255,0.4)",
          border: "none", borderRadius: 3, cursor: "pointer", textTransform: "capitalize",
          letterSpacing: "0.05em",
        }}>{v}</button>
      ))}
    </div>
  );
}

export default function MidtermModal({ results, onDismiss }) {
  const [animated, setAnimated] = useState(false);
  const [viewMode, setViewMode] = useState("faction");

  useEffect(() => {
    if (!results) return;
    const t = setTimeout(() => setAnimated(true), 350);
    return () => clearTimeout(t);
  }, [results]);

  if (!results) return null;

  const {
    yr, pp, partyEnthusiasm, oppEnthusiasm, approvalAtElection,
    houseNetChange, senateNetChange, factionBreakdown, isPresidentialYear,
  } = results;

  const houseGain = houseNetChange >= 0;
  const senateGain = senateNetChange >= 0;

  const allyBreakdown = factionBreakdown.filter(f => f.party === pp);
  const oppoBreakdown = factionBreakdown.filter(f => f.party !== pp);
  const orderedBreakdown = [...allyBreakdown, ...oppoBreakdown];

  // Build party-aggregated data
  const partyMap = {};
  orderedBreakdown.forEach(f => {
    if (!partyMap[f.party]) partyMap[f.party] = {
      id: f.party,
      name: PARTY_NAMES[f.party] || f.party,
      color: PARTY_COLORS[f.party] || "#888",
      newHouse: 0, newSenate: 0, oldHouse: 0, oldSenate: 0, houseChange: 0, senateChange: 0,
    };
    partyMap[f.party].newHouse += f.newHouse;
    partyMap[f.party].newSenate += f.newSenate;
    partyMap[f.party].oldHouse += f.oldHouse;
    partyMap[f.party].oldSenate += f.oldSenate;
    partyMap[f.party].houseChange += f.houseChange;
    partyMap[f.party].senateChange += f.senateChange;
  });
  const partyBreakdown = [
    ...Object.values(partyMap).filter(p => p.id === pp),
    ...Object.values(partyMap).filter(p => p.id !== pp),
  ];

  const displayBreakdown = viewMode === "party" ? partyBreakdown : orderedBreakdown;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1050, padding: 16,
    }}>
      <div style={{
        background: "#0d1a2e",
        borderRadius: 6,
        maxWidth: 440, width: "100%", maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
        color: "#e8eef5",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.15)" }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              {isPresidentialYear ? "General Election" : "Midterm Election"}
            </span>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.15)" }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>
            Year {yr} Results
          </div>
          {isPresidentialYear && (
            <div style={{
              marginTop: 8, padding: "5px 10px",
              background: "rgba(239,159,39,0.15)", border: "1px solid rgba(239,159,39,0.3)",
              borderRadius: 4, fontSize: 10, color: "#EF9F27", textAlign: "center",
            }}>
              Presidential race not simulated — Congressional results shown below.
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px" }}>
          {/* Approval + Enthusiasm row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Approval", value: `${approvalAtElection}%`, color: approvalAtElection > 50 ? "#1D9E75" : approvalAtElection > 38 ? "#EF9F27" : "#E24B4A" },
              { label: "Party Enthusiasm", value: `${partyEnthusiasm}`, color: "#378ADD" },
              { label: "Opp. Enthusiasm", value: `${oppEnthusiasm}`, color: "#E24B4A" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center", padding: "8px 4px", background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
                <div style={{ fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Net change summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{
              padding: "10px 14px", borderRadius: 4, textAlign: "center",
              background: houseGain ? "rgba(29,158,117,0.12)" : "rgba(226,75,74,0.12)",
              border: `1px solid ${houseGain ? "rgba(29,158,117,0.3)" : "rgba(226,75,74,0.3)"}`,
            }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>House (all 435)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: houseGain ? "#1D9E75" : "#E24B4A" }}>
                {houseGain ? "+" : ""}{houseNetChange}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>seats {houseGain ? "gained" : "lost"}</div>
            </div>
            <div style={{
              padding: "10px 14px", borderRadius: 4, textAlign: "center",
              background: senateGain ? "rgba(29,158,117,0.12)" : "rgba(226,75,74,0.12)",
              border: `1px solid ${senateGain ? "rgba(29,158,117,0.3)" : "rgba(226,75,74,0.3)"}`,
            }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Senate (33 up)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: senateGain ? "#1D9E75" : "#E24B4A" }}>
                {senateGain ? "+" : ""}{senateNetChange}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>seats {senateGain ? "gained" : "lost"}</div>
            </div>
          </div>

          {/* Bar view toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Congressional Seats</span>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {/* House animated bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>House of Representatives</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>218 majority</span>
            </div>
            <div style={{ height: 20, borderRadius: 3, overflow: "hidden", display: "flex", background: "rgba(255,255,255,0.05)", position: "relative" }}>
              {displayBreakdown.map((f, i) => {
                const pct = (f.newHouse / 435) * 100;
                return (
                  <div key={f.id} style={{
                    height: "100%",
                    width: animated ? `${pct}%` : "0%",
                    background: f.color,
                    transition: `width 0.8s cubic-bezier(0.22,1,0.36,1) ${200 + i * 80}ms`,
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {pct > 8 && (
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                        {f.newHouse}
                      </span>
                    )}
                  </div>
                );
              })}
              <div style={{ position: "absolute", left: `${(218 / 435) * 100}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.5)" }} />
            </div>
          </div>

          {/* Senate animated bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Senate</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>51 majority</span>
            </div>
            <div style={{ height: 20, borderRadius: 3, overflow: "hidden", display: "flex", background: "rgba(255,255,255,0.05)", position: "relative" }}>
              {displayBreakdown.map((f, i) => {
                const pct = (f.newSenate / 100) * 100;
                return (
                  <div key={f.id} style={{
                    height: "100%",
                    width: animated ? `${pct}%` : "0%",
                    background: f.color,
                    transition: `width 0.8s cubic-bezier(0.22,1,0.36,1) ${800 + i * 80}ms`,
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {pct > 8 && (
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                        {f.newSenate}
                      </span>
                    )}
                  </div>
                );
              })}
              <div style={{ position: "absolute", left: "51%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.5)" }} />
            </div>
          </div>

          {/* Faction/Party breakdown table */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
              {viewMode === "party" ? "Party Results" : "Faction Results"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {displayBreakdown.map(f => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
                  background: "rgba(255,255,255,0.04)", borderRadius: 3,
                  borderLeft: `3px solid ${f.color}`,
                }}>
                  <span style={{ flex: 1, fontSize: 10, color: "rgba(255,255,255,0.8)" }}>{f.name}</span>
                  <div style={{ display: "flex", gap: 6, fontSize: 9 }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      H: {f.oldHouse} → <b style={{ color: "#fff" }}>{f.newHouse}</b>
                      <span style={{ color: f.houseChange > 0 ? "#1D9E75" : f.houseChange < 0 ? "#E24B4A" : "rgba(255,255,255,0.3)", marginLeft: 3 }}>
                        ({f.houseChange >= 0 ? "+" : ""}{f.houseChange})
                      </span>
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      S: {f.oldSenate} → <b style={{ color: "#fff" }}>{f.newSenate}</b>
                      <span style={{ color: f.senateChange > 0 ? "#1D9E75" : f.senateChange < 0 ? "#E24B4A" : "rgba(255,255,255,0.3)", marginLeft: 3 }}>
                        ({f.senateChange >= 0 ? "+" : ""}{f.senateChange})
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Congress note */}
          <div style={{ marginBottom: 16, padding: "8px 10px", background: "rgba(55,138,221,0.1)", border: "1px solid rgba(55,138,221,0.25)", borderRadius: 4, fontSize: 10, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
            New Congress will be sworn in at the start of next year.
          </div>

          <button
            onClick={onDismiss}
            style={{
              width: "100%", padding: "11px 0", fontSize: 13, fontWeight: 600,
              background: "#1a2e4a", color: "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4, cursor: "pointer", letterSpacing: "0.04em",
            }}
          >
            Acknowledge Results
          </button>
        </div>
      </div>
    </div>
  );
}
