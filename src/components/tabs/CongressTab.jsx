import { useState } from "react";
import CongressBar from "../CongressBar.jsx";
import LegislationRecord from "../LegislationRecord.jsx";

// ── Shared styles ─────────────────────────────────────────────────────────────

const panelStyle = {
  background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-lg)",
  overflow: "hidden",
};

const PARTY_COLORS = { DEM: "#3b7dd8", REP: "#c0392b" };
const PARTY_NAMES  = { DEM: "Democrats", REP: "Republicans" };

// ── Congressional role derivation ─────────────────────────────────────────────
// Returns a map of factionId → { role, chamber } for the HIGHEST official role.
// Priority (descending): Speaker > Senate Majority Leader > House Majority Leader
//                        > Senate Minority Leader > House Minority Leader

const ROLE_PRIORITY = {
  "Speaker of the House":   5,
  "Senate Majority Leader": 4,
  "House Majority Leader":  3,
  "Senate Minority Leader": 2,
  "House Minority Leader":  1,
};

// Role → which chamber leader to display (house or senate)
const ROLE_CHAMBER = {
  "Speaker of the House":   "house",
  "House Majority Leader":  "house",
  "House Minority Leader":  "house",
  "Senate Majority Leader": "senate",
  "Senate Minority Leader": "senate",
};

function deriveRoles(allyF, oppoF) {
  const byHouseAlly  = [...allyF].sort((a, b) => (b.houseSeats  || 0) - (a.houseSeats  || 0));
  const bySenateAlly = [...allyF].sort((a, b) => (b.senateSeats || 0) - (a.senateSeats || 0));
  const byHouseOppo  = [...oppoF].sort((a, b) => (b.houseSeats  || 0) - (a.houseSeats  || 0));
  const bySenateOppo = [...oppoF].sort((a, b) => (b.senateSeats || 0) - (a.senateSeats || 0));

  // Map factionId → best role title (highest priority wins)
  const roles = {};
  function assign(faction, role) {
    if (!faction) return;
    const cur = roles[faction.id];
    if (!cur || ROLE_PRIORITY[role] > ROLE_PRIORITY[cur]) {
      roles[faction.id] = role;
    }
  }

  assign(byHouseOppo[0],  "House Minority Leader");
  assign(byHouseAlly[1],  "House Majority Leader");
  assign(bySenateOppo[0], "Senate Minority Leader");
  assign(bySenateAlly[0], "Senate Majority Leader");
  // Speaker assigned last — highest priority, always wins
  assign(byHouseAlly[0],  "Speaker of the House");

  return roles;
}

// Get the named leader object for a given role from a faction.
// House roles use faction.houseLeader; Senate roles use faction.senateLeader.
// Falls back to faction.leader if those aren't present (old save data).
function officialLeader(faction, role) {
  if (!faction) return null;
  const chamber = ROLE_CHAMBER[role];
  if (chamber === "house")   return faction.houseLeader  ?? faction.leader;
  if (chamber === "senate")  return faction.senateLeader ?? faction.leader;
  return faction.leader;
}

// Derive roles for a history snapshot
function deriveRolesFromSnapshot(factions, pp) {
  const vals  = Object.values(factions);
  const allyF = vals.filter(f => f.party === pp);
  const oppoF = vals.filter(f => f.party !== pp);
  return deriveRoles(allyF, oppoF);
}

// ── Small stat bar ────────────────────────────────────────────────────────────

function StatBar({ label, value, max = 100 }) {
  const pct = Math.round(Math.min(100, Math.max(0, (value / max) * 100)));
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: 9 }}>
        <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "var(--color-background-tertiary)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-text-secondary)", opacity: 0.45, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ── Leader card (compact, click-to-expand) ────────────────────────────────────

function LeaderCard({ roleTitle, leaderObj, factionName, faction, isVP = false, selectedId, onSelect }) {
  const name   = leaderObj?.name ?? "—";
  const cardId = `${roleTitle}_${name}`;
  const isOpen = selectedId === cardId;

  return (
    <div
      onClick={() => onSelect(isOpen ? null : cardId)}
      style={{
        padding: "9px 14px",
        borderRadius: "var(--border-radius-md)",
        border: "0.5px solid var(--color-border-secondary)",
        background: isOpen
          ? "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0))"
          : "var(--color-background-primary)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.11em", color: "var(--color-text-secondary)", marginBottom: 3 }}>
        {roleTitle}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>
        {name}
      </div>
      <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>
        {isVP ? "Vice President of the United States" : factionName}
      </div>

      {isOpen && !isVP && leaderObj && (
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: "0.5px solid var(--color-border-secondary)",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "3px 12px", fontSize: 9,
        }}>
          {[
            { label: "Faction",   value: faction?.name },
            { label: "Party",     value: faction?.party === "DEM" ? "Democrat" : "Republican" },
            { label: "H. Seats",  value: faction?.houseSeats },
            { label: "S. Seats",  value: faction?.senateSeats },
            { label: "Charisma",  value: leaderObj.charisma },
            { label: "Authority", value: leaderObj.authority },
            { label: "Sincerity", value: leaderObj.sincerity },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Minority divider ──────────────────────────────────────────────────────────

function MinorityDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
      <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-secondary)" }} />
      <span style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
        Minority
      </span>
      <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-secondary)" }} />
    </div>
  );
}

// ── Leadership panel (top box) ────────────────────────────────────────────────

function LeadershipPanel({ allyF, oppoF, vpn, executiveOverreach }) {
  const [selectedId, setSelectedId] = useState(null);

  const byHouseAlly  = [...allyF].sort((a, b) => (b.houseSeats  || 0) - (a.houseSeats  || 0));
  const bySenateAlly = [...allyF].sort((a, b) => (b.senateSeats || 0) - (a.senateSeats || 0));
  const byHouseOppo  = [...oppoF].sort((a, b) => (b.houseSeats  || 0) - (a.houseSeats  || 0));
  const bySenateOppo = [...oppoF].sort((a, b) => (b.senateSeats || 0) - (a.senateSeats || 0));

  const speaker      = byHouseAlly[0];
  const houseMajLdr  = byHouseAlly[1];
  const houseMinLdr  = byHouseOppo[0];
  const senateMajLdr = bySenateAlly[0];
  const senateMinLdr = bySenateOppo[0];

  const or      = Math.round(executiveOverreach ?? 20);
  const orLevel = or > 60 ? "High" : or > 30 ? "Medium" : "Low";
  const orColor = or > 60 ? "#E24B4A" : or > 30 ? "#EF9F27" : "#1D9E75";

  const toggle = id => setSelectedId(prev => prev === id ? null : id);

  return (
    <div style={panelStyle}>
      <div style={{ padding: "12px 20px 10px", borderBottom: "0.5px solid var(--color-border-secondary)" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", marginBottom: 3 }}>
          United States Congress
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>Congress</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 0.5px 1fr" }}>
        {/* House */}
        <div style={{ padding: "12px 14px 14px" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)", marginBottom: 10 }}>
            House of Representatives
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {speaker && (
              <LeaderCard roleTitle="Speaker of the House"
                leaderObj={officialLeader(speaker, "Speaker of the House")}
                factionName={speaker.name} faction={speaker}
                selectedId={selectedId} onSelect={toggle} />
            )}
            {houseMajLdr && (
              <LeaderCard roleTitle="House Majority Leader"
                leaderObj={officialLeader(houseMajLdr, "House Majority Leader")}
                factionName={houseMajLdr.name} faction={houseMajLdr}
                selectedId={selectedId} onSelect={toggle} />
            )}
            <MinorityDivider />
            {houseMinLdr && (
              <LeaderCard roleTitle="House Minority Leader"
                leaderObj={officialLeader(houseMinLdr, "House Minority Leader")}
                factionName={houseMinLdr.name} faction={houseMinLdr}
                selectedId={selectedId} onSelect={toggle} />
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ background: "var(--color-border-secondary)" }} />

        {/* Senate */}
        <div style={{ padding: "12px 14px 14px" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)", marginBottom: 10 }}>
            Senate
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <LeaderCard roleTitle="President of the Senate"
              leaderObj={{ name: vpn || "Vice President" }}
              factionName="" faction={null}
              isVP selectedId={selectedId} onSelect={toggle} />
            {senateMajLdr && (
              <LeaderCard roleTitle="Senate Majority Leader"
                leaderObj={officialLeader(senateMajLdr, "Senate Majority Leader")}
                factionName={senateMajLdr.name} faction={senateMajLdr}
                selectedId={selectedId} onSelect={toggle} />
            )}
            <MinorityDivider />
            {senateMinLdr && (
              <LeaderCard roleTitle="Senate Minority Leader"
                leaderObj={officialLeader(senateMinLdr, "Senate Minority Leader")}
                factionName={senateMinLdr.name} faction={senateMinLdr}
                selectedId={selectedId} onSelect={toggle} />
            )}
          </div>
        </div>
      </div>

      {/* Exec overreach */}
      <div style={{
        borderTop: "0.5px solid var(--color-border-secondary)",
        padding: "8px 14px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 9, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>Executive Overreach</span>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--color-background-tertiary)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${or}%`, background: orColor, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 9, color: orColor, fontWeight: 600, whiteSpace: "nowrap" }}>{or} · {orLevel}</span>
      </div>
    </div>
  );
}

// ── Congress control bars ─────────────────────────────────────────────────────

function ControlBarsPanel({ allF, allyF, hovFaction, setHovFaction }) {
  const [barMode, setBarMode] = useState("party");

  const pp = allyF[0]?.party;
  const partyMap = {};
  allF.forEach(f => {
    if (!partyMap[f.party]) partyMap[f.party] = {
      id: f.party, name: PARTY_NAMES[f.party] || f.party,
      color: PARTY_COLORS[f.party] || "#888",
      houseSeats: 0, senateSeats: 0,
    };
    partyMap[f.party].houseSeats  += f.houseSeats  || 0;
    partyMap[f.party].senateSeats += f.senateSeats || 0;
  });
  const partyList = [
    ...Object.values(partyMap).filter(p => p.id === pp),
    ...Object.values(partyMap).filter(p => p.id !== pp),
  ];
  const displayFactions = barMode === "party" ? partyList : allF;

  return (
    <div style={panelStyle}>
      <div style={{ padding: "10px 14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
          Chamber Control
        </div>
        <div style={{ display: "flex", gap: 2, background: "var(--color-background-tertiary)", borderRadius: "var(--border-radius-md)", padding: 2 }}>
          {["party", "faction"].map(v => (
            <button key={v} onClick={() => setBarMode(v)} style={{
              padding: "2px 8px", fontSize: 9, fontWeight: barMode === v ? 600 : 400,
              background: barMode === v ? "var(--color-background-secondary)" : "transparent",
              color: barMode === v ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
              textTransform: "capitalize",
            }}>{v}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "8px 14px 4px" }}>
        <CongressBar factions={displayFactions} chamber="Senate"
          hoveredFaction={barMode === "faction" ? hovFaction : null}
          setHoveredFaction={barMode === "faction" ? setHovFaction : () => {}} />
        <CongressBar factions={displayFactions} chamber="House"
          hoveredFaction={barMode === "faction" ? hovFaction : null}
          setHoveredFaction={barMode === "faction" ? setHovFaction : () => {}} />
      </div>
      <div style={{ padding: "0 14px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {displayFactions.map(f => (
          <div key={f.id}
            style={{ display: "flex", alignItems: "center", gap: 3, cursor: barMode === "faction" ? "pointer" : "default",
              opacity: barMode === "faction" && hovFaction && hovFaction !== f.id ? 0.35 : 1, transition: "opacity 0.15s" }}
            onMouseEnter={() => barMode === "faction" && setHovFaction(f.id)}
            onMouseLeave={() => barMode === "faction" && setHovFaction(null)}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: f.color }} />
            <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{f.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Faction cards ─────────────────────────────────────────────────────────────

function FactionCard({ f, pf, officialRole }) {
  const isBase = f.id === pf;
  // Determine which named leader to show and what title/badge
  let displayLeader = f.leader;
  let officialBadge = null;
  if (officialRole) {
    displayLeader = officialLeader(f, officialRole);
    officialBadge = officialRole === "Speaker of the House"   ? "Speaker" :
                    officialRole === "Senate Majority Leader"  ? "Senate Maj. Leader" :
                    officialRole === "House Majority Leader"   ? "House Maj. Leader" :
                    officialRole === "Senate Minority Leader"  ? "Senate Min. Leader" :
                    officialRole === "House Minority Leader"   ? "House Min. Leader" : null;
  }

  return (
    <div style={{
      padding: "10px 12px",
      borderRadius: "var(--border-radius-md)",
      border: isBase
        ? `1px solid var(--color-border-secondary)`
        : "0.5px solid var(--color-border-secondary)",
      background: isBase
        ? "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))"
        : "var(--color-background-primary)",
      borderLeft: `3px solid ${f.color || "var(--color-border-secondary)"}`,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 1 }}>
            {f.name}
            {isBase && <span style={{ fontSize: 8, color: "var(--color-text-secondary)", fontWeight: 400, marginLeft: 5 }}>Base</span>}
          </div>
          {officialBadge && (
            <div style={{ fontSize: 8, color: "var(--color-text-secondary)" }}>{officialBadge}</div>
          )}
        </div>
        <div style={{ fontSize: 9, color: "var(--color-text-secondary)", whiteSpace: "nowrap", paddingLeft: 6 }}>
          {f.senateSeats}S · {f.houseSeats}H
        </div>
      </div>

      {/* Leader */}
      {displayLeader && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 9 }}>
          <span style={{ color: "var(--color-text-secondary)" }}>
            {displayLeader.name}
          </span>
          <div style={{ display: "flex", gap: 8, color: "var(--color-text-secondary)" }}>
            <span>Chr {displayLeader.charisma}</span>
            <span>Auth {displayLeader.authority}</span>
            <span>Sin {displayLeader.sincerity}</span>
          </div>
        </div>
      )}

      {/* Rel / Trust / Unity bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
        <StatBar label="Rel"   value={f.relationship ?? 50} />
        <StatBar label="Trust" value={f.trust        ?? 50} />
        <StatBar label="Unity" value={f.unity        ?? 50} />
      </div>
    </div>
  );
}

function FactionsPanel({ allyF, oppoF, pf, roles }) {
  return (
    <div style={panelStyle}>
      <div style={{ padding: "10px 14px 12px", borderBottom: "0.5px solid var(--color-border-secondary)" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
          Congressional Factions
        </div>
      </div>
      <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 0.5px 1fr" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 10 }}>
          <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.10em", color: "var(--color-text-secondary)", marginBottom: 2 }}>
            Your Coalition
          </div>
          {allyF.map(f => <FactionCard key={f.id} f={f} pf={pf} officialRole={roles[f.id] ?? null} />)}
        </div>
        <div style={{ background: "var(--color-border-secondary)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 10 }}>
          <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.10em", color: "var(--color-text-secondary)", marginBottom: 2 }}>
            Opposition
          </div>
          {oppoF.map(f => <FactionCard key={f.id} f={f} pf={pf} officialRole={roles[f.id] ?? null} />)}
        </div>
      </div>
    </div>
  );
}

// ── Congress history ──────────────────────────────────────────────────────────

function CongressHistoryPane({ congressHistory }) {
  const [barMode, setBarMode] = useState("party");

  if (!congressHistory || congressHistory.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", padding: "24px 0", textAlign: "center" }}>
        No elections held yet. First election is Year 2, Week 44.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", gap: 2, background: "var(--color-background-tertiary)", borderRadius: "var(--border-radius-md)", padding: 2 }}>
          {["party", "faction"].map(v => (
            <button key={v} onClick={() => setBarMode(v)} style={{
              padding: "2px 8px", fontSize: 9, fontWeight: barMode === v ? 600 : 400,
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
        const partyMap = {};
        factionList.forEach(f => {
          if (!partyMap[f.party]) partyMap[f.party] = {
            id: f.party, name: PARTY_NAMES[f.party] || f.party,
            color: PARTY_COLORS[f.party] || "#888",
            houseSeats: 0, senateSeats: 0,
          };
          partyMap[f.party].houseSeats  += f.houseSeats  || 0;
          partyMap[f.party].senateSeats += f.senateSeats || 0;
        });
        const partyList = [
          ...Object.values(partyMap).filter(p => p.id === entry.pp),
          ...Object.values(partyMap).filter(p => p.id !== entry.pp),
        ];
        const displayFactions = barMode === "party" ? partyList : factionList;

        const snapRoles   = deriveRolesFromSnapshot(entry.factions, entry.pp);
        const ROLE_ORDER  = ["Speaker of the House", "Senate Majority Leader", "House Majority Leader", "Senate Minority Leader", "House Minority Leader"];
        const roleEntries = Object.entries(snapRoles)
          .map(([fid, role]) => ({ role, factionName: entry.factions[fid]?.name || fid }))
          .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

        const houseGain  = entry.houseNetChange  >= 0;
        const senateGain = entry.senateNetChange >= 0;

        return (
          <div key={entry.yr} style={panelStyle}>
            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5px solid var(--color-border-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {entry.isInitial ? "Starting Congress" : `Year ${entry.yr} ${entry.isPresidentialYear ? "Election" : "Midterms"}`}
                </span>
                {entry.isPresidentialYear && !entry.isInitial && (
                  <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "var(--color-background-tertiary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)" }}>
                    Presidential Year
                  </span>
                )}
              </div>
              {!entry.isInitial && (
                <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
                  <span style={{ color: houseGain ? "#1D9E75" : "#E24B4A", fontWeight: 600 }}>House: {houseGain ? "+" : ""}{entry.houseNetChange}</span>
                  <span style={{ color: senateGain ? "#1D9E75" : "#E24B4A", fontWeight: 600 }}>Senate: {senateGain ? "+" : ""}{entry.senateNetChange}</span>
                </div>
              )}
            </div>
            <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
              <div>
                {!entry.isInitial && (
                  <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                    Approval: <b style={{ color: "var(--color-text-primary)" }}>{entry.approvalAtElection}%</b>
                    <span style={{ marginLeft: 10 }}>Enthusiasm: <b style={{ color: "var(--color-text-primary)" }}>{entry.partyEnthusiasm}</b></span>
                    <span style={{ marginLeft: 10 }}>Opp: <b style={{ color: "var(--color-text-primary)" }}>{entry.oppEnthusiasm}</b></span>
                  </div>
                )}
                <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 3 }}>Senate</div>
                <CongressBar factions={displayFactions} chamber="Senate" hoveredFaction={null} setHoveredFaction={() => {}} />
                <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 3 }}>House</div>
                <CongressBar factions={displayFactions} chamber="House" hoveredFaction={null} setHoveredFaction={() => {}} />
              </div>
              <div>
                <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 6 }}>
                  Congressional Leadership
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {roleEntries.map(({ role, factionName }) => (
                    <div key={role} style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>{role}</span>
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{factionName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Confirmation history ──────────────────────────────────────────────────────

function ConfirmationHistoryPane({ confirmationHistory }) {
  if (!confirmationHistory.length) {
    return (
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", padding: "24px 0", textAlign: "center" }}>
        No Senate confirmation votes have occurred yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {[...confirmationHistory].reverse().map(entry => (
        <div key={entry.id} style={panelStyle}>
          <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 1 }}>{entry.nomineeName}</div>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{entry.officeLabel}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: entry.passed ? "#1D9E75" : "#E24B4A", marginBottom: 1 }}>
                {entry.passed ? "Confirmed" : "Rejected"}
              </div>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{entry.senateYes}–{entry.senateNo}</div>
            </div>
          </div>
          <div style={{ padding: "6px 14px 10px", borderTop: "0.5px solid var(--color-border-secondary)", display: "flex", gap: 16, flexWrap: "wrap", fontSize: 9, color: "var(--color-text-secondary)" }}>
            <span>Committee: <b style={{ color: "var(--color-text-primary)" }}>{entry.committeeYes}–{entry.committeeNo}</b></span>
            <span>Y{entry.year} · W{entry.weekOfYear}</span>
            {entry.personality && (
              <span>Type: <b style={{ color: "var(--color-text-primary)", textTransform: "capitalize" }}>{entry.personality.toLowerCase()}</b></span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main CongressTab ──────────────────────────────────────────────────────────

export default function CongressTab({
  allF, allyF, oppoF, pf,
  vpn,
  congressTab, setCongressTab,
  hovFaction, setHovFaction,
  billRecord,
  executiveOverreach,
  congressHistory,
  confirmationHistory,
  // factionHist retained for future use
}) {
  const roles = deriveRoles(allyF, oppoF);

  return (
    <>
      <div style={{ display: "flex", gap: 1, marginBottom: 10, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 4 }}>
        {["overview", "legislation", "confirmations", "history"].map(ct => (
          <button key={ct} onClick={() => setCongressTab(ct)} style={{
            padding: "3px 9px", fontSize: 11,
            fontWeight: congressTab === ct ? 500 : 400,
            background: congressTab === ct ? "var(--color-background-secondary)" : "transparent",
            color: congressTab === ct ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
            textTransform: "capitalize",
          }}>{ct}</button>
        ))}
      </div>

      {congressTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <LeadershipPanel allyF={allyF} oppoF={oppoF} vpn={vpn} executiveOverreach={executiveOverreach} />
          <ControlBarsPanel allF={allF} allyF={allyF} hovFaction={hovFaction} setHovFaction={setHovFaction} />
          <FactionsPanel allyF={allyF} oppoF={oppoF} pf={pf} roles={roles} />
        </div>
      )}

      {congressTab === "legislation" && <LegislationRecord billRecord={billRecord} />}

      {congressTab === "confirmations" && (
        <ConfirmationHistoryPane confirmationHistory={confirmationHistory || []} />
      )}

      {congressTab === "history" && (
        <CongressHistoryPane congressHistory={congressHistory || []} />
      )}
    </>
  );
}
