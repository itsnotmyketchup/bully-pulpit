import { BILL_STAGES } from "../data/policies.js";
import Badge from "./Badge.jsx";

function voteLabel(voteProb) {
  if (voteProb >= 0.70) return { text: "Supporting", color: "#1D9E75" };
  if (voteProb >= 0.50) return { text: "Leaning Yes", color: "#5BB878" };
  if (voteProb >= 0.30) return { text: "Leaning No", color: "#E27D27" };
  return { text: "Opposing", color: "#E24B4A" };
}

function unityLabel(unity) {
  if (unity >= 75) return { text: "United", color: "#1D9E75" };
  if (unity >= 55) return { text: "Stable", color: "#EF9F27" };
  return { text: "Split", color: "#E24B4A" };
}

export default function BillProgress({ bill, passLikelihood, factionVotes, process, topControls, midControls }) {
  const view = process || (bill ? {
    name: bill.act.name,
    desc: bill.act.desc,
    badgeLabel: "In Congress",
    stage: bill.stage,
    turnsInStage: bill.turnsInStage,
    fails: bill.fails,
    stages: BILL_STAGES,
    factionVotes,
    passLikelihood,
    senateOnly: false,
    isBudget: bill.isBudget,
  } : null);
  if (!view) return null;

  const stages = view.stages || BILL_STAGES;
  const stageIdx = stages.findIndex(s => s.id === view.stage);
  const isChamberVote = view.stage === "first_chamber" || view.stage === "second_chamber";
  const isRecon = view.isBudget;
  const senThreshold = view.senateOnly ? 0.50 : (!isRecon && isChamberVote) ? 0.60 : 0.50;

  // Compute totals from factionVotes if available
  const totalSenate = view.factionVotes ? view.factionVotes.reduce((s, f) => s + f.senateSeats, 0) : 0;
  const totalHouse = view.factionVotes ? view.factionVotes.reduce((s, f) => s + f.houseSeats, 0) : 0;
  const aggSenYes = view.factionVotes ? view.factionVotes.reduce((s, f) => s + f.senateYes, 0) : 0;
  const aggHouYes = view.factionVotes ? view.factionVotes.reduce((s, f) => s + f.houseYes, 0) : 0;
  const senNeeded = Math.ceil(totalSenate * senThreshold);
  const houNeeded = Math.ceil(totalHouse * 0.50);
  const senMet = aggSenYes >= senNeeded;
  const houMet = aggHouYes >= houNeeded;

  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: "var(--border-radius-lg)",
      border: "1.5px solid var(--color-border-info)",
      background: "var(--color-background-secondary)",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{view.name}</span>
          <Badge color="#378ADD">{view.badgeLabel || "In Process"}</Badge>
        </div>
        {view.fails > 0 && (
          <Badge color="#E24B4A">{view.fails}/3 setback{view.fails !== 1 ? "s" : ""}</Badge>
        )}
      </div>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>
        {view.desc}
      </div>
      {topControls ? <div style={{ marginBottom: 8 }}>{topControls}</div> : null}

      {/* Stage progress bar */}
      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
        {stages.map((stage, i) => {
          const passed = i < stageIdx;
          const current = i === stageIdx;
          return (
            <div key={stage.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: "100%", height: 6, borderRadius: 3,
                background: passed ? "#1D9E75" : current ? "#378ADD" : "var(--color-background-tertiary)",
                transition: "background 0.3s", position: "relative", overflow: "hidden",
              }}>
                {current && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg, #378ADD 0%, #60a5fa 50%, #378ADD 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s infinite linear",
                  }} />
                )}
              </div>
              <span style={{
                fontSize: 9, fontWeight: current ? 600 : 400,
                color: passed ? "#1D9E75" : current ? "#378ADD" : "var(--color-text-secondary)",
                whiteSpace: "nowrap",
              }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current status + pass likelihood */}
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2 }}>
        Stage: <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
          {stages[stageIdx]?.desc || "Unknown"}
        </span>
        {view.turnsInStage > 0 && (
          <span> — {view.turnsInStage} turn{view.turnsInStage !== 1 ? "s" : ""} pending</span>
        )}
      </div>
      {view.passLikelihood !== undefined && (
        <div style={{ marginBottom: 8, fontSize: 10 }}>
          Pass likelihood: <span style={{ fontWeight: 600, color: view.passLikelihood > 50 ? "#1D9E75" : "#E24B4A" }}>{view.passLikelihood}%</span>
        </div>
      )}
      {midControls ? <div style={{ marginBottom: 8 }}>{midControls}</div> : null}

      {/* Per-faction vote breakdown */}
      {view.factionVotes && view.factionVotes.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
            {view.senateOnly ? "Senate Support" : "Congressional Support"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
            {view.factionVotes.map(fv => {
              const label = voteLabel(fv.voteProb);
              const ul = unityLabel(fv.unity);
              const yesPct = fv.senateSeats > 0 ? fv.senateYes / fv.senateSeats : 0;
              const shortName = fv.name.split(" ")[0];
              return (
                <div key={fv.fid} style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 48px", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 9, color: "var(--color-text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortName}</span>
                  {/* Mini yes/no bar */}
                  <div style={{ height: 6, borderRadius: 3, background: "var(--color-background-tertiary)", overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${yesPct * 100}%`, background: label.color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 9, color: label.color, fontWeight: 500, textAlign: "right" }}>{label.text}</span>
                  <span style={{ fontSize: 8, color: ul.color, textAlign: "right" }}>{ul.text}</span>
                </div>
              );
            })}
          </div>

          {/* Aggregate Senate + House totals */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Senate", yes: aggSenYes, total: totalSenate, needed: senNeeded, met: senMet, threshold: senThreshold },
              ...(!view.senateOnly ? [{ label: "House", yes: aggHouYes, total: totalHouse, needed: houNeeded, met: houMet, threshold: 0.50 }] : []),
            ].map(ch => (
              <div key={ch.label} style={{ flex: 1, background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", padding: "5px 7px", border: `1px solid ${ch.met ? "#1D9E7540" : "#E24B4A40"}` }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 3 }}>{ch.label}</div>
                <div style={{ height: 5, borderRadius: 3, background: "var(--color-background-tertiary)", position: "relative", marginBottom: 3 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(1, ch.yes / ch.total) * 100}%`, background: ch.met ? "#1D9E75" : "#E24B4A", borderRadius: 3 }} />
                  {/* Threshold marker */}
                  <div style={{ position: "absolute", top: -1, bottom: -1, left: `${ch.threshold * 100}%`, width: 1.5, background: "#EF9F27", borderRadius: 1 }} />
                </div>
                <div style={{ fontSize: 9, color: ch.met ? "#1D9E75" : "#E24B4A", fontWeight: 500 }}>
                  {ch.yes}/{ch.total} {ch.met ? "✓" : `(need ${ch.needed})`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
