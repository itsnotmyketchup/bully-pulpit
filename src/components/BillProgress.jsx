import { useState } from "react";

import { BILL_STAGES } from "../data/policies.js";
import Badge from "./Badge.jsx";

function voteLabel(voteProb) {
  if (voteProb >= 0.7) return { text: "Supporting", color: "#1D9E75" };
  if (voteProb >= 0.5) return { text: "Leaning Yes", color: "#5BB878" };
  if (voteProb >= 0.3) return { text: "Leaning No", color: "#E27D27" };
  return { text: "Opposing", color: "#E24B4A" };
}

function unityLabel(unity) {
  if (unity >= 75) return { text: "United", color: "#1D9E75" };
  if (unity >= 55) return { text: "Stable", color: "#EF9F27" };
  return { text: "Split", color: "#E24B4A" };
}

function chamberLabel(chamber) {
  return chamber === "senate" ? "Senate" : "House";
}

function stageDescriptions(view) {
  if (view.stages?.length) return view.stages;
  const firstLabel = chamberLabel(view.firstChamber || "house");
  const secondLabel = chamberLabel((view.firstChamber || "house") === "house" ? "senate" : "house");
  return BILL_STAGES.map((stage) => {
    if (stage.id === "first_chamber") return { ...stage, label: firstLabel, desc: `Vote in the ${firstLabel}` };
    if (stage.id === "second_chamber") return { ...stage, label: secondLabel, desc: `Vote in the ${secondLabel}` };
    return stage;
  });
}

export default function BillProgress({ bill, process, topControls, midControls }) {
  const view = process || (bill ? {
    name: bill.act.name,
    desc: bill.act.desc,
    badgeLabel: "In Congress",
    stage: bill.stage,
    turnsInStage: bill.turnsInStage,
    fails: bill.fails,
    factionVotes: bill.billFactionVotes,
    passLikelihood: bill.billLikelihood,
    isBudget: bill.isBudget,
    firstChamber: bill.firstChamber,
    currentChamber: bill.currentChamber,
    salience: bill.salience,
    considerationWeeksLeft: bill.considerationWeeksLeft,
    supportView: bill.supportView || bill.currentChamber || bill.firstChamber || "house",
    senateOnly: bill.senateOnly || false,
  } : null);
  const [supportView, setSupportView] = useState(view?.supportView || (view?.senateOnly ? "senate" : "house"));
  if (!view) return null;

  const stages = stageDescriptions(view);
  const stageIdx = stages.findIndex((stage) => stage.id === view.stage);
  const totalSenate = view.factionVotes ? view.factionVotes.reduce((sum, vote) => sum + vote.senateSeats, 0) : 0;
  const totalHouse = view.factionVotes ? view.factionVotes.reduce((sum, vote) => sum + vote.houseSeats, 0) : 0;
  const aggSenYes = view.factionVotes ? view.factionVotes.reduce((sum, vote) => sum + vote.senateYes, 0) : 0;
  const aggHouYes = view.factionVotes ? view.factionVotes.reduce((sum, vote) => sum + vote.houseYes, 0) : 0;
  const senThreshold = supportView === "senate" && (view.stage === "first_chamber" || view.stage === "second_chamber") ? 0.6 : 0.5;
  const senNeeded = Math.ceil(totalSenate * senThreshold);
  const houNeeded = Math.ceil(totalHouse * 0.5);
  const saliencePct = Math.max(0, Math.min(100, view.salience || 0));

  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: "var(--border-radius-lg)",
      border: "1.5px solid var(--color-border-info)",
      background: "var(--color-background-secondary)",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{view.name}</span>
          <Badge color="#378ADD">{view.badgeLabel || "In Process"}</Badge>
        </div>
        {view.fails > 0 && <Badge color="#E24B4A">{view.fails}/3 setbacks</Badge>}
      </div>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>
        {view.desc}
      </div>
      {view.salience != null && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Salience
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#2563eb" }}>{saliencePct}/100</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--color-background-tertiary)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${saliencePct}%`, background: "linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)", borderRadius: 999 }} />
          </div>
        </div>
      )}
      {topControls ? <div style={{ marginBottom: 8 }}>{topControls}</div> : null}

      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
        {stages.map((stage, index) => {
          const passed = index < stageIdx;
          const current = index === stageIdx;
          return (
            <div key={stage.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: "100%",
                height: 6,
                borderRadius: 3,
                background: passed ? "#1D9E75" : current ? "#378ADD" : "var(--color-background-tertiary)",
                position: "relative",
                overflow: "hidden",
              }}>
                {current && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(90deg, #378ADD 0%, #60a5fa 50%, #378ADD 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s infinite linear",
                  }} />
                )}
              </div>
              <span style={{ fontSize: 9, fontWeight: current ? 600 : 400, color: passed ? "#1D9E75" : current ? "#378ADD" : "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2 }}>
        Stage: <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{stages[stageIdx]?.desc || "Unknown"}</span>
        {view.stage === "committee" && view.considerationWeeksLeft > 0 && <span> — {view.considerationWeeksLeft} wk until committee review</span>}
      </div>
      {view.passLikelihood !== undefined && (
        <div style={{ marginBottom: 8, fontSize: 10 }}>
          Pass likelihood: <span style={{ fontWeight: 600, color: view.passLikelihood > 50 ? "#1D9E75" : "#E24B4A" }}>{view.passLikelihood}%</span>
        </div>
      )}
      {midControls ? <div style={{ marginBottom: 8 }}>{midControls}</div> : null}

      {view.factionVotes && view.factionVotes.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Congressional Support
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(view.senateOnly ? ["senate"] : ["house", "senate"]).map((chamber) => (
                <button
                  key={chamber}
                  onClick={() => setSupportView(chamber)}
                  style={{
                    padding: "3px 8px",
                    fontSize: 9,
                    borderRadius: "var(--border-radius-md)",
                    border: "0.5px solid var(--color-border-secondary)",
                    background: supportView === chamber ? "var(--color-background-primary)" : "transparent",
                    color: supportView === chamber ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {chamberLabel(chamber)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
            {view.factionVotes.map((fv) => {
              const label = voteLabel(fv.voteProb);
              const ul = unityLabel(fv.unity);
              const seats = supportView === "senate" ? fv.senateSeats : fv.houseSeats;
              const yesVotes = supportView === "senate" ? fv.senateYes : fv.houseYes;
              const yesPct = seats > 0 ? yesVotes / seats : 0;
              return (
                <div key={fv.fid} style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 48px", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 9, color: "var(--color-text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fv.name.split(" ")[0]}</span>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--color-background-tertiary)", overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${yesPct * 100}%`, background: label.color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 9, color: label.color, fontWeight: 500, textAlign: "right" }}>{label.text}</span>
                  <span style={{ fontSize: 8, color: ul.color, textAlign: "right" }}>{ul.text}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Senate", yes: aggSenYes, total: totalSenate, needed: senNeeded, met: aggSenYes >= senNeeded, threshold: senThreshold },
              { label: "House", yes: aggHouYes, total: totalHouse, needed: houNeeded, met: aggHouYes >= houNeeded, threshold: 0.5 },
            ].filter((chamber) => !view.senateOnly || chamber.label === "Senate").map((chamber) => (
              <div key={chamber.label} style={{ flex: 1, background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", padding: "5px 7px", border: `1px solid ${chamber.met ? "#1D9E7540" : "#E24B4A40"}` }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 3 }}>{chamber.label}</div>
                <div style={{ height: 5, borderRadius: 3, background: "var(--color-background-tertiary)", position: "relative", marginBottom: 3 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(1, chamber.yes / chamber.total) * 100}%`, background: chamber.met ? "#1D9E75" : "#E24B4A", borderRadius: 3 }} />
                  <div style={{ position: "absolute", top: -1, bottom: -1, left: `${chamber.threshold * 100}%`, width: 1.5, background: "#EF9F27", borderRadius: 1 }} />
                </div>
                <div style={{ fontSize: 9, color: chamber.met ? "#1D9E75" : "#E24B4A", fontWeight: 500 }}>
                  {chamber.yes}/{chamber.total} {chamber.met ? "✓" : `(need ${chamber.needed})`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
