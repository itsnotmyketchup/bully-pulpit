import { useState } from "react";
import {
  IDEOLOGY_LABEL, IDEOLOGY_COLOR, SCOTUS_IDEOLOGIES,
} from "../../logic/scotusAppointments.js";
import BillProgress from "../BillProgress.jsx";

// ── Shared panel style ────────────────────────────────────────────────────────

const panelStyle = {
  background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-lg)",
  overflow: "hidden",
};

const divider = { borderTop: "0.5px solid var(--color-border-secondary)" };

// ── Court composition bar (9 equal segments) ──────────────────────────────────

const PARTY_COLORS = { DEM: "#378ADD", REP: "#E24B4A" };

function CourtCompositionBar({ justices, playerParty }) {
  const [mode, setMode] = useState("ideology"); // "ideology" | "party"

  // 9 slots ordered: chief first, then associates in stable order
  const chief     = justices.find(j => j && j.isChief);
  const assocs    = justices.filter(j => j && !j.isChief);
  const slots     = [chief, ...assocs]; // may contain undefined if vacant

  // Count each segment
  const counts = {};
  slots.forEach(j => {
    if (!j) { counts["vacant"] = (counts["vacant"] || 0) + 1; return; }
    const key = mode === "party" ? j.party : j.ideology;
    counts[key] = (counts[key] || 0) + 1;
  });

  // Build ordered segment list
  let segments;
  if (mode === "ideology") {
    segments = [
      ...SCOTUS_IDEOLOGIES.filter(id => counts[id] > 0).map(id => ({
        key: id, label: IDEOLOGY_LABEL[id], count: counts[id], color: IDEOLOGY_COLOR[id],
      })),
      ...(counts["vacant"] ? [{ key: "vacant", label: "Vacant", count: counts["vacant"], color: "#888" }] : []),
    ];
  } else {
    const pp = playerParty;
    const op = pp === "DEM" ? "REP" : "DEM";
    segments = [
      ...(counts[pp]  ? [{ key: pp,       label: pp === "DEM" ? "Democrat" : "Republican",    count: counts[pp],      color: PARTY_COLORS[pp] }] : []),
      ...(counts[op]  ? [{ key: op,       label: op === "DEM" ? "Democrat" : "Republican",    count: counts[op],      color: PARTY_COLORS[op] }] : []),
      ...(counts["vacant"] ? [{ key: "vacant", label: "Vacant", count: counts["vacant"], color: "#888" }] : []),
    ];
  }

  return (
    <div style={{ padding: "10px 16px 12px" }}>
      {/* Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 2, background: "var(--color-background-tertiary)", borderRadius: "var(--border-radius-md)", padding: 2 }}>
          {["ideology", "party"].map(v => (
            <button key={v} onClick={() => setMode(v)} style={{
              padding: "2px 8px", fontSize: 9, fontWeight: mode === v ? 600 : 400,
              background: mode === v ? "var(--color-background-secondary)" : "transparent",
              color: mode === v ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
              textTransform: "capitalize",
            }}>{v}</button>
          ))}
        </div>
      </div>

      {/* Bar — 9 equal tiles, sorted left-to-right by ideology */}
      {(() => {
        const IDEOLOGY_ORDER = { very_liberal: 0, liberal: 1, conservative: 2, very_conservative: 3 };
        const sortedSlots = [...slots].sort((a, b) => {
          const aOrder = a ? (IDEOLOGY_ORDER[a.ideology] ?? 2) : 4; // vacant at end
          const bOrder = b ? (IDEOLOGY_ORDER[b.ideology] ?? 2) : 4;
          return aOrder - bOrder;
        });
        return (
          <div style={{ display: "flex", height: 20, gap: 2, marginBottom: 8 }}>
            {sortedSlots.map((j, i) => {
              const color = !j ? "#888" : (mode === "party" ? (PARTY_COLORS[j.party] || "#888") : IDEOLOGY_COLOR[j.ideology]);
              return (
                <div key={i} style={{ flex: 1, borderRadius: 3, background: color, opacity: 0.82 }} />
              );
            })}
          </div>
        );
      })()}

      {/* Legend */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {segments.map(s => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, opacity: 0.82 }} />
            <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>
              {s.label}: {s.count}
            </span>
          </div>
        ))}
        <span style={{ fontSize: 9, color: "var(--color-text-secondary)", marginLeft: "auto" }}>
          5 for majority
        </span>
      </div>
    </div>
  );
}

// ── Justice card (compact, click-to-expand) ───────────────────────────────────

function JusticeCard({ justice, isChief, isVacant, selectedId, onSelect }) {
  const id      = justice?.id ?? (isChief ? "__chief_vacant__" : "__assoc_vacant__");
  const isOpen  = selectedId === id;

  return (
    <div
      onClick={() => onSelect(isOpen ? null : id)}
      style={{
        ...panelStyle,
        cursor: "pointer",
        userSelect: "none",
        transition: "box-shadow 0.12s",
        boxShadow: isOpen ? "0 0 0 1px var(--color-border-secondary)" : "none",
      }}
    >
      {/* Compact face */}
      <div style={{
        padding: isChief ? "10px 14px" : "8px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 8, textTransform: "uppercase", letterSpacing: "0.11em",
          color: "var(--color-text-secondary)",
        }}>
          {isChief ? "Chief Justice" : "Associate Justice"}
        </div>
        <div style={{
          fontSize: isChief ? 14 : 12,
          fontWeight: isChief ? 700 : 500,
          color: isVacant ? "var(--color-text-secondary)" : "var(--color-text-primary)",
          lineHeight: 1.25,
        }}>
          {isVacant ? "Vacant" : justice.name}
        </div>
        {isVacant && (
          <div style={{ fontSize: 8, color: "var(--color-text-secondary)", fontStyle: "italic" }}>
            Awaiting nomination
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {isOpen && !isVacant && (
        <div style={{ ...divider, padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            { label: "Ideology", value: IDEOLOGY_LABEL[justice.ideology], style: { color: IDEOLOGY_COLOR[justice.ideology] } },
            { label: "Party",    value: justice.party === "DEM" ? "Democrat" : "Republican",
              style: { color: justice.party === "DEM" ? "#378ADD" : "#E24B4A" } },
            { label: "Age",      value: justice.age },
            { label: "Served",   value: `${justice.timeServed} yr${justice.timeServed !== 1 ? "s" : ""}` },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
              <span style={{ fontWeight: 600, ...row.style }}>{row.value}</span>
            </div>
          ))}
        </div>
      )}
      {isOpen && isVacant && (
        <div style={{ ...divider, padding: "6px 12px 8px" }}>
          <div style={{ fontSize: 9, color: "var(--color-text-secondary)", fontStyle: "italic", textAlign: "center" }}>
            Seat is currently vacant
          </div>
        </div>
      )}
    </div>
  );
}

// ── Candidate picker ──────────────────────────────────────────────────────────

function CandidatePicker({ vacancy, allFactions, onSelectCandidate, onNominate, onVetMore }) {
  if (!vacancy || vacancy.stage !== "selecting") return null;
  const { candidates, selectedId, vetMoreUsed } = vacancy;
  const factionMap = Object.fromEntries(allFactions.map(f => [f.id, f]));

  return (
    <div style={panelStyle}>
      <div style={{ padding: "12px 16px 10px", ...divider, borderTop: "none", borderBottom: "0.5px solid var(--color-border-secondary)" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.11em", color: "var(--color-text-secondary)", marginBottom: 2 }}>
          Nomination — Supreme Court {vacancy.isChief ? "(Chief Justice)" : "(Associate Justice)"}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
          Select a nominee to send to the Senate for confirmation.
        </div>
      </div>

      <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
        {candidates.map(c => {
          const isSelected = c.id === selectedId;
          const color = IDEOLOGY_COLOR[c.ideology];
          return (
            <button
              key={c.id}
              onClick={() => onSelectCandidate(c.id)}
              style={{
                textAlign: "left", padding: "9px 13px",
                borderRadius: "var(--border-radius-md)",
                border: isSelected
                  ? "1px solid var(--color-border-secondary)"
                  : "0.5px solid var(--color-border-secondary)",
                background: isSelected
                  ? "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0))"
                  : "var(--color-background-primary)",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 1 }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>
                  {c.party === "DEM" ? "Democrat" : "Republican"} · Age {c.age}
                </div>
              </div>
              <div style={{ fontSize: 10, color, fontWeight: 600, whiteSpace: "nowrap" }}>
                {IDEOLOGY_LABEL[c.ideology]}
              </div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 190 }}>
                {Object.entries(c.factionReactions).map(([fid, val]) => (
                  <span key={fid} style={{
                    fontSize: 8, padding: "1px 4px", borderRadius: 3,
                    background: val >= 0 ? "#1D9E7520" : "#E24B4A20",
                    color: val >= 0 ? "#1D9E75" : "#E24B4A",
                  }}>
                    {factionMap[fid]?.name?.split(" ")[0] || fid}: {val >= 0 ? "+" : ""}{Math.round(val * 100)}%
                  </span>
                ))}
              </div>
              {isSelected && (
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-primary)", flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "0 16px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {!vetMoreUsed ? (
          <button onClick={onVetMore} style={{
            padding: "6px 11px", fontSize: 10, fontWeight: 600,
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-md)",
            background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer",
          }}>
            Vet More Candidates
          </button>
        ) : (
          <div style={{ fontSize: 9, color: "var(--color-text-secondary)", fontStyle: "italic" }}>
            Additional candidates vetted
          </div>
        )}
        <button onClick={onNominate} disabled={!selectedId} style={{
          padding: "8px 14px", fontSize: 11, fontWeight: 600,
          border: "none", borderRadius: "var(--border-radius-md)",
          background: "var(--color-text-primary)", color: "var(--color-background-primary)",
          opacity: selectedId ? 1 : 0.4, cursor: selectedId ? "pointer" : "not-allowed",
        }}>
          Nominate
        </button>
      </div>
    </div>
  );
}

// ── Confirmation progress ─────────────────────────────────────────────────────

function ScotusConfirmation({ pending, surrogates, onLobby }) {
  if (!pending) return null;
  return (
    <BillProgress
      process={{
        name: `${pending.nomineeName} Nomination`,
        desc: `Nominee for Supreme Court ${pending.isChief ? "(Chief Justice)" : "(Associate Justice)"}.`,
        badgeLabel: "Pending Confirmation",
        stage: pending.stage,
        turnsInStage: pending.turnsInStage || 0,
        fails: pending.fails || 0,
        stages: pending.stages,
        factionVotes: pending.factionVotes,
        passLikelihood: pending.passLikelihood,
        senateOnly: true,
      }}
      midControls={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
            {surrogates?.find(s => s.id === "s1")?.name || "Senior Advisor"}
          </div>
          <button
            onClick={onLobby}
            disabled={pending.lobbyUsedStage === pending.stage}
            style={{
              padding: "4px 8px", fontSize: 10, fontWeight: 600,
              border: "none", borderRadius: "var(--border-radius-md)",
              background: "#EF9F27", color: "#fff",
              opacity: pending.lobbyUsedStage === pending.stage ? 0.45 : 1,
              cursor: pending.lobbyUsedStage === pending.stage ? "not-allowed" : "pointer",
            }}
          >
            Lobby
          </button>
        </div>
      }
    />
  );
}

// ── Main JudiciaryTab ─────────────────────────────────────────────────────────

export default function JudiciaryTab({
  scotusJustices,
  scotusVacancy,
  scotusPendingConfirmation,
  scotusRulings,
  playerParty,
  surrogates,
  allFactions,
  onSelectCandidate,
  onNominate,
  onVetMore,
  onLobbyScotus,
}) {
  const [selectedCardId, setSelectedCardId] = useState(null);

  if (!scotusJustices || scotusJustices.length === 0) return null;

  const chief      = scotusJustices.find(j => j.isChief);
  const associates = scotusJustices.filter(j => !j.isChief);

  const chiefVacant   = scotusVacancy?.isChief === true;
  const assocVacantId = !chiefVacant ? scotusVacancy?.justiceId : null;

  const displayChief = chiefVacant ? null : chief;

  // Chief surname for title
  const chiefLastName = displayChief?.name?.split(" ").pop() ?? "";

  // Associate display: replace the vacated justice with null
  const displayAssociates = associates.map(j =>
    j.id === assocVacantId ? null : j
  );
  if (assocVacantId && !displayAssociates.includes(null)) {
    displayAssociates.push(null);
  }

  // All slots for the composition bar
  const allSlots = [displayChief, ...displayAssociates];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── Court panel ── */}
      <div style={panelStyle}>

        {/* Header */}
        <div style={{ padding: "14px 20px 12px", borderBottom: "0.5px solid var(--color-border-secondary)" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", marginBottom: 4 }}>
            Supreme Court of the United States
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {chiefLastName ? `The ${chiefLastName} Court` : "Supreme Court"}
          </div>
        </div>

        {/* Chief Justice card — centered */}
        <div style={{ padding: "14px 16px 10px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 220 }}>
            <JusticeCard
              justice={displayChief}
              isChief
              isVacant={chiefVacant || !displayChief}
              selectedId={selectedCardId}
              onSelect={setSelectedCardId}
            />
          </div>
        </div>

        {/* Associate Justices — 4-column grid */}
        <div style={{
          padding: "0 16px 14px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
        }}>
          {displayAssociates.map((j, i) => (
            <JusticeCard
              key={j?.id ?? `vacant_${i}`}
              justice={j}
              isChief={false}
              isVacant={!j}
              selectedId={selectedCardId}
              onSelect={setSelectedCardId}
            />
          ))}
        </div>

        {/* Composition bar */}
        <div style={{ borderTop: "0.5px solid var(--color-border-secondary)" }}>
          <CourtCompositionBar justices={allSlots} playerParty={playerParty} />
        </div>

      </div>

      {/* ── Nomination picker ── */}
      {scotusVacancy?.stage === "selecting" && (
        <CandidatePicker
          vacancy={scotusVacancy}
          allFactions={allFactions}
          onSelectCandidate={onSelectCandidate}
          onNominate={onNominate}
          onVetMore={onVetMore}
        />
      )}

      {/* ── Senate confirmation progress ── */}
      {scotusPendingConfirmation && (
        <ScotusConfirmation
          pending={scotusPendingConfirmation}
          surrogates={surrogates}
          onLobby={onLobbyScotus}
        />
      )}

      <div style={panelStyle}>
        <div style={{ padding: "12px 16px 10px", borderBottom: "0.5px solid var(--color-border-secondary)" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.11em", color: "var(--color-text-secondary)", marginBottom: 2 }}>
            Supreme Court Rulings
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            Major decisions from the current Court.
          </div>
        </div>

        {!scotusRulings?.length && (
          <div style={{ padding: "14px 16px", fontSize: 10, color: "var(--color-text-secondary)", fontStyle: "italic" }}>
            No Supreme Court rulings yet.
          </div>
        )}

        {scotusRulings?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {scotusRulings.map((ruling, index) => (
              <div key={ruling.id || `${ruling.orderId}_${index}`} style={{ padding: "11px 16px", ...(index > 0 ? divider : {}) }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {ruling.orderName}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>
                    Wk {((ruling.week - 1) % 52) + 1}, Yr {ruling.year}
                  </div>
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: ruling.decision === "struck_down" ? "#E24B4A" : "#1D9E75", fontWeight: 600 }}>
                  {ruling.decision === "struck_down" ? "Struck down" : "Upheld"} · {ruling.vote}
                </div>
                <div style={{ marginTop: 4, fontSize: 9, color: "var(--color-text-secondary)" }}>
                  Majority opinion author: {ruling.majorityAuthor || "Per curiam"}
                </div>
                {ruling.majorityJustices?.length > 0 && (
                  <div style={{ marginTop: 2, fontSize: 9, color: "var(--color-text-secondary)" }}>
                    {ruling.decision === "struck_down" ? "To strike down" : "To uphold"}: {ruling.majorityJustices.join(", ")}
                  </div>
                )}
                {ruling.dissentAuthor && (
                  <div style={{ marginTop: 2, fontSize: 9, color: "var(--color-text-secondary)" }}>
                    Dissenting opinion author: {ruling.dissentAuthor}
                  </div>
                )}
                {ruling.dissentJustices?.length > 0 && (
                  <div style={{ marginTop: 2, fontSize: 9, color: "var(--color-text-secondary)" }}>
                    {ruling.decision === "struck_down" ? "To uphold" : "To strike down"}: {ruling.dissentJustices.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
