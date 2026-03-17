import Badge from "../Badge.jsx";
import DualMeter from "../DualMeter.jsx";
import CongressBar from "../CongressBar.jsx";
import LegislationRecord from "../LegislationRecord.jsx";

export default function CongressTab({ allF, allyF, oppoF, pf, congressTab, setCongressTab, hovFaction, setHovFaction, billRecord, executiveOverreach }) {
  const or = Math.round(executiveOverreach ?? 20);
  const orLevel = or > 60 ? "High" : or > 30 ? "Medium" : "Low";
  const orColor = or > 60 ? "#E24B4A" : or > 30 ? "#EF9F27" : "#1D9E75";

  return <>
    {/* Congress sub-tabs */}
    <div style={{ display: "flex", gap: 1, marginBottom: 10, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 4 }}>
      {["overview", "legislation"].map(ct => (
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
  </>;
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
