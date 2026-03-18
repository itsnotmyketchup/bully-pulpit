import { FACTION_DATA, PARTIES } from "../../data/factions.js";
import BillProgress from "../BillProgress.jsx";

const panelStyle = {
  background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-lg)",
  overflow: "hidden",
};

function formatTenure(startWeek, currentWeek) {
  const weeks = Math.max(0, currentWeek - startWeek);
  const years = Math.floor(weeks / 52);
  const remWeeks = weeks % 52;
  if (years === 0) return `${remWeeks} wk${remWeeks !== 1 ? "s" : ""}`;
  return `${years}y ${remWeeks}w`;
}

function formatStart(startWeek) {
  const startYear = Math.ceil(startWeek / 52);
  const startWeekOfYear = ((startWeek - 1) % 52) + 1;
  return `Y${startYear} · W${startWeekOfYear}`;
}

function factionLabel(pp, pf) {
  return FACTION_DATA[pp]?.find(f => f.id === pf)?.name || "Independent";
}

function Metadata({ items }) {
  return (
    <div style={{ textAlign: "right", minWidth: 210, fontSize: 10, lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
      {items.map(item => (
        <div key={`${item.label}-${item.value}`}>
          <span>{item.label}: </span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function ExecutiveRow({ title, name, subtitle, startWeek, currentWeek, metadata, prominent = false, attached = false }) {
  return (
    <div style={{
      padding: prominent ? "18px 20px" : "12px 16px",
      display: "flex",
      gap: 14,
      alignItems: "center",
      borderTop: attached ? "0.5px solid var(--color-border-secondary)" : "none",
      background: prominent ? "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0))" : "transparent",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.11em", color: "var(--color-text-secondary)", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: prominent ? 24 : 18, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{name}</div>
        <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{subtitle}</div>
      </div>
      <Metadata
        items={[
          ...metadata,
          { label: "Start", value: formatStart(startWeek) },
          { label: "Serving for", value: formatTenure(startWeek, currentWeek) },
        ]}
      />
    </div>
  );
}

function SecStateRow({ secState, allFactions, act, currentWeek, pendingAppointment, onStartSelection, onSelectCandidate, onConfirmCandidate }) {
  const factionMap = Object.fromEntries(allFactions.map(faction => [faction.id, faction]));
  const isPending = pendingAppointment?.officeId === "sec_state";
  const selectedCandidate = secState.candidates.find(candidate => candidate.id === secState.selectedCandidateId);
  const occupantFaction = secState.factionId ? factionMap[secState.factionId] : null;

  return (
    <div style={{
      ...panelStyle,
      opacity: secState.occupantName ? 1 : 0.92,
      background: secState.occupantName
        ? "var(--color-background-secondary)"
        : "linear-gradient(180deg, rgba(120,120,120,0.08), rgba(120,120,120,0.03))",
      borderColor: secState.occupantName ? "var(--color-border-secondary)" : "var(--color-border-tertiary)",
    }}>
      <div style={{ padding: "12px 16px", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.11em", color: "var(--color-text-secondary)", marginBottom: 4 }}>Secretary of State</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{secState.occupantName || "Vacant"}</div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
            {secState.occupantName ? "Department of State" : "This office is vacant. Appointing one costs 1 action."}
          </div>
        </div>
        {secState.occupantName ? (
          <Metadata
            items={[
              { label: "Party", value: occupantFaction?.party === "DEM" ? "Democrat" : occupantFaction?.party === "REP" ? "Republican" : "Independent" },
              { label: "Faction", value: occupantFaction?.name || "Independent" },
              { label: "Start", value: formatStart(secState.startWeek || 1) },
              { label: "Serving for", value: formatTenure(secState.startWeek || 1, currentWeek) },
            ]}
          />
        ) : null}
        {!secState.occupantName && secState.candidates.length === 0 && !isPending && (
          <button
            onClick={onStartSelection}
            disabled={act >= 4}
            style={{
              padding: "8px 12px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--border-radius-md)",
              cursor: act >= 4 ? "not-allowed" : "pointer",
              background: "var(--color-text-primary)",
              color: "var(--color-background-primary)",
              opacity: act >= 4 ? 0.5 : 1,
            }}
          >
            Nominate
          </button>
        )}
      </div>

      {!secState.occupantName && secState.candidates.length > 0 && !isPending && (
        <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {secState.candidates.map(candidate => (
            <button
              key={candidate.id}
              onClick={() => onSelectCandidate(candidate.id)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: "var(--border-radius-md)",
                border: candidate.id === secState.selectedCandidateId ? `1px solid ${factionMap[candidate.factionId]?.color || "#378ADD"}` : "0.5px solid var(--color-border-secondary)",
                background: candidate.id === secState.selectedCandidateId ? `${factionMap[candidate.factionId]?.color || "#378ADD"}18` : "var(--color-background-primary)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{candidate.name}</div>
                <div style={{ fontSize: 9, color: factionMap[candidate.factionId]?.color || "var(--color-text-secondary)" }}>{candidate.factionName}</div>
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#3b82f611", color: "#2563eb" }}>Chr {candidate.charisma}</span>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#10b98111", color: "#059669" }}>Exp {candidate.experience}</span>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {Object.entries(candidate.reactions).map(([fid, value]) => (
                  <span key={fid} style={{
                    fontSize: 8,
                    padding: "2px 5px",
                    borderRadius: 4,
                    background: value >= 0 ? "#1D9E7522" : "#E24B4A22",
                    color: value >= 0 ? "#1D9E75" : "#E24B4A",
                  }}>
                    {factionMap[fid]?.name?.split(" ")[0] || fid}: {value >= 0 ? "+" : ""}{Math.round(value * 100)}%
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {!secState.occupantName && selectedCandidate && !isPending && (
        <div style={{ padding: "0 16px 16px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onConfirmCandidate}
            style={{
              padding: "8px 12px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--border-radius-md)",
              cursor: "pointer",
              background: "var(--color-text-primary)",
              color: "var(--color-background-primary)",
            }}
          >
            Confirm Nominee
          </button>
        </div>
      )}
    </div>
  );
}

function FedRow({ macroState, currentWeek }) {
  return (
    <div style={{ ...panelStyle, padding: "12px 16px", display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.11em", color: "var(--color-text-secondary)", marginBottom: 4 }}>Federal Reserve Chair</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{macroState.fedChairName}</div>
        <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Board of Governors of the Federal Reserve System</div>
      </div>
      <Metadata
        items={[
          { label: "Party", value: "Independent" },
          { label: "Start", value: formatStart(macroState.fedChairStartWeek || 1) },
          { label: "Serving for", value: formatTenure(macroState.fedChairStartWeek || 1, currentWeek) },
        ]}
      />
    </div>
  );
}

export default function CabinetTab({
  pn,
  vpn,
  pp,
  pf,
  week,
  macroState,
  cabinet,
  act,
  pendingAppointment,
  surrogates,
  onStartSecStateSelection,
  onSelectSecStateCandidate,
  onNominateSecStateCandidate,
  onLobbyAppointment,
  onFastTrackAppointment,
}) {
  const partyName = PARTIES[pp];
  const factionName = factionLabel(pp, pf);
  const allFactions = [...FACTION_DATA.DEM, ...FACTION_DATA.REP];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={panelStyle}>
        <ExecutiveRow
          title="President of the United States"
          name={pn}
          subtitle="Commander in Chief"
          startWeek={1}
          currentWeek={week}
          metadata={[
            { label: "Party", value: partyName },
            { label: "Faction", value: factionName },
          ]}
          prominent
        />
        <ExecutiveRow
          title="Vice President"
          name={vpn}
          subtitle="President of the Senate"
          startWeek={1}
          currentWeek={week}
          metadata={[
            { label: "Party", value: partyName },
            { label: "Faction", value: factionName },
          ]}
          attached
        />
      </div>

      <SecStateRow
        secState={cabinet.secState}
        allFactions={allFactions}
        act={act}
        currentWeek={week}
        pendingAppointment={pendingAppointment}
        onStartSelection={onStartSecStateSelection}
        onSelectCandidate={onSelectSecStateCandidate}
        onConfirmCandidate={onNominateSecStateCandidate}
      />

      {pendingAppointment && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <BillProgress
            process={{
              name: `${pendingAppointment.nomineeName} Nomination`,
              desc: `Nominee for ${pendingAppointment.officeLabel}.`,
              badgeLabel: "Pending Confirmation",
              stage: pendingAppointment.stage,
              turnsInStage: pendingAppointment.turnsInStage || 0,
              fails: pendingAppointment.fails || 0,
              stages: pendingAppointment.stages,
              factionVotes: pendingAppointment.factionVotes,
              passLikelihood: pendingAppointment.passLikelihood,
              senateOnly: true,
            }}
            midControls={pendingAppointment.isHighPriority ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                    {surrogates.find(s => s.id === "s1")?.name || "Senior Advisor"}
                  </div>
                  <button
                    onClick={onLobbyAppointment}
                    disabled={pendingAppointment.lobbyUsedStage === pendingAppointment.stage}
                    style={{
                      padding: "4px 8px",
                      fontSize: 10,
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "var(--border-radius-md)",
                      background: "#EF9F27",
                      color: "#fff",
                      opacity: pendingAppointment.lobbyUsedStage === pendingAppointment.stage ? 0.45 : 1,
                      cursor: pendingAppointment.lobbyUsedStage === pendingAppointment.stage ? "not-allowed" : "pointer",
                    }}
                  >
                    Lobby
                  </button>
                </div>
                <button
                  onClick={onFastTrackAppointment}
                  disabled={pendingAppointment.lobbyUsedStage === pendingAppointment.stage}
                  style={{
                    padding: "7px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "var(--border-radius-md)",
                    background: "#1a2744",
                    color: "#fff",
                    opacity: pendingAppointment.lobbyUsedStage === pendingAppointment.stage ? 0.4 : 1,
                    cursor: pendingAppointment.lobbyUsedStage === pendingAppointment.stage ? "not-allowed" : "pointer",
                  }}
                >
                  Fast-Track
                </button>
              </div>
            ) : null}
          />
        </div>
      )}

      <FedRow macroState={macroState} currentWeek={week} />
    </div>
  );
}
