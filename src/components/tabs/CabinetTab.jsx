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

export default function CabinetTab({ pn, vpn, pp, pf, week, macroState, pendingAppointment }) {
  const partyName = PARTIES[pp];
  const factionName = factionLabel(pp, pf);

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

      {pendingAppointment && (
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
        />
      )}

      <FedRow macroState={macroState} currentWeek={week} />
    </div>
  );
}
