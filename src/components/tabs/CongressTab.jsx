import { useState } from "react";
import Badge from "../Badge.jsx";
import DualMeter from "../DualMeter.jsx";
import CongressBar from "../CongressBar.jsx";
import LegislationRecord from "../LegislationRecord.jsx";

const PARTY_COLORS = { dem: "#3b7dd8", rep: "#c0392b" };
const PARTY_NAMES = { dem: "Democrats", rep: "Republicans" };

export default function CongressTab({ allF, allyF, oppoF, pf, congressTab, setCongressTab, hovFaction, setHovFaction, billRecord, executiveOverreach, congressHistory }) {
  const or = Math.round(executiveOverreach ?? 20);
  const orLevel = or > 60 ? "High" : or > 30 ? "Medium" : "Low";
  const orColor = or > 60 ? "#E24B4A" : or > 30 ? "#EF9F27" : "#1D9E75";

  return <>
    {/* Congress sub-tabs */}
    <div style={{ display: "flex", gap: 1, marginBottom: 10, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 4 }}>
      {["overview", "legislation", "history"].map(ct => (
        <button key={ct} onClick={() => setCongressTab(ct)} style={{
          padding: "3px 9px", fontSize: 11, fontWeight: congressTab === ct ? 500 : 400,
          background: congressTab === ct ? "var(--color-background-secondary)" : "transparent",
          color: congressTab === ct ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
          textTransform: "capitalize",
        }}>{ct}</button>
      ))}
    </div>

    {congressTab === "overview" && <>
      <div style={{ marginBottom: 6 }}>
        <CongressBar factions={allF} chamber="Senate" hoveredFaction={hovFaction} setHoveredFaction={setHovFaction} />
        <CongressBar factions={allF} chamber="House" hoveredFaction={hovFaction} setHoveredFaction={setHovFaction} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>Exec. overreach:</span>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--color-background-tertiary)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${or}%`, background: orColor, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 9, color: orColor, fontWeight: 600, whiteSpace: "nowrap" }}>{or} · {orLevel}</span>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", marginBottom: 10 }}>
        {allF.map(f => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 3, opacity: hovFaction && hovFaction !== f.id ? 0.4 : 1, transition: "opacity 0.15s", cursor: "pointer" }}
            onMouseEnter={() => setHovFaction(f.id)} onMouseLeave={() => setHovFaction(null)}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: f.color }} />
            <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{f.name}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 5 }}>Your coalition</div>
      {allyF.map(f => <FactionCard key={f.id} f={f} pf={pf} isOpposition={false} />)}
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 5, marginTop: 8 }}>Opposition</div>
      {oppoF.map(f => <FactionCard key={f.id} f={f} pf={pf} isOpposition={true} />)}
    </>}

    {congressTab === "legislation" && <LegislationRecord billRecord={billRecord} />}

    {congressTab === "history" && <CongressHistoryPane congressHistory={congressHistory || []} allF={allF} />}
  </>;
}

function CongressHistoryPane({ congressHistory, allF }) {
  const [barMode, setBarMode] = useState("faction");

  if (!congressHistory || congressHistory.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", padding: "24px 0", textAlign: "center" }}>
        No elections held yet. First election is Year 2, Week 44.
      </div>
    );
  }

  return (
    <div>
      {/* Global bar mode toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 2, background: "var(--color-background-tertiary)", borderRadius: "var(--border-radius-md)", padding: 2 }}>
          {["faction", "party"].map(v => (
            <button key={v} onClick={() => setBarMode(v)} style={{
              padding: "3px 9px", fontSize: 10, fontWeight: barMode === v ? 500 : 400,
              background: barMode === v ? "var(--color-background-secondary)" : "transparent",
              color: barMode === v ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
              textTransform: "capitalize",
            }}>{v}</button>
          ))}
        </div>
      </div>

      {[...congressHistory].reverse().map(entry => {
        const factionList = Object.values(entry.factions);
        // Build party-aggregated pseudo-factions for CongressBar
        const partyMap = {};
        factionList.forEach(f => {
          if (!partyMap[f.party]) partyMap[f.party] = {
            id: f.party, name: PARTY_NAMES[f.party] || f.party,
            color: PARTY_COLORS[f.party] || "#888",
            houseSeats: 0, senateSeats: 0,
          };
          partyMap[f.party].houseSeats += f.houseSeats || 0;
          partyMap[f.party].senateSeats += f.senateSeats || 0;
        });
        const partyList = [
          ...Object.values(partyMap).filter(p => p.id === entry.pp),
          ...Object.values(partyMap).filter(p => p.id !== entry.pp),
        ];
        const displayFactions = barMode === "party" ? partyList : factionList;

        const houseGain = entry.houseNetChange >= 0;
        const senateGain = entry.senateNetChange >= 0;
        return (
          <div key={entry.yr} style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  Year {entry.yr} {entry.isPresidentialYear ? "Election" : "Midterms"}
                </span>
                {entry.isPresidentialYear && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#EF9F2722", color: "#EF9F27", border: "0.5px solid #EF9F2744" }}>Pres. Year</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, fontSize: 10 }}>
                <span style={{ color: houseGain ? "#1D9E75" : "#E24B4A", fontWeight: 600 }}>
                  H: {houseGain ? "+" : ""}{entry.houseNetChange}
                </span>
                <span style={{ color: senateGain ? "#1D9E75" : "#E24B4A", fontWeight: 600 }}>
                  S: {senateGain ? "+" : ""}{entry.senateNetChange}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 9, color: "var(--color-text-secondary)" }}>
              <span>Approval: <b style={{ color: "var(--color-text-primary)" }}>{entry.approvalAtElection}%</b></span>
              <span>Party Enthusiasm: <b style={{ color: "#378ADD" }}>{entry.partyEnthusiasm}</b></span>
              <span>Opp: <b style={{ color: "#E24B4A" }}>{entry.oppEnthusiasm}</b></span>
            </div>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>House (pre-election)</div>
              <CongressBar factions={displayFactions} chamber="House" hoveredFaction={null} setHoveredFaction={() => {}} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Senate (pre-election)</div>
              <CongressBar factions={displayFactions} chamber="Senate" hoveredFaction={null} setHoveredFaction={() => {}} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FactionCard({ f, pf, isOpposition }) {
  return (
    <div style={{ marginBottom: 6, padding: "8px 10px", borderRadius: "var(--border-radius-lg)", border: f.id === pf ? `2px solid ${f.color}` : "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: f.color }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{f.name}</span>
          {f.id === pf && <Badge color={f.color}>Base</Badge>}
          {isOpposition && <Badge color="#E24B4A">Opp</Badge>}
        </div>
        <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{f.senateSeats}S {f.houseSeats}H</span>
      </div>
      {f.leader && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Leader: <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{f.leader.name}</span></span>
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#3b82f611", color: "#2563eb" }}>Chr {f.leader.charisma}</span>
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#8b5cf611", color: "#7c3aed" }}>Auth {f.leader.authority}</span>
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#10b98111", color: "#059669" }}>Sin {f.leader.sincerity}</span>
          </div>
        </div>
      )}
      <DualMeter trust={f.trust} relationship={f.relationship} color={f.color} unity={f.unity} />
    </div>
  );
}
