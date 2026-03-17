import { POLICY_ACTIONS } from "../../data/policies.js";
import Badge from "../Badge.jsx";
import DualMeter from "../DualMeter.jsx";
import MiniChart from "../MiniChart.jsx";
import SectionHeader from "../SectionHeader.jsx";

export default function PartyTab({
  allF, allyF, cg, pf,
  factionHist, promises, usedPol, billCooldowns, week,
  surrogates, surrogateUI, setSurrogateUI,
  coachCooldown, countries, visitedCountries, act,
  onMakePromise, onAssignSurrogate,
}) {
  const partyApproval = allyF.length > 0 ? Math.round(allyF.reduce((s, f) => s + f.relationship, 0) / allyF.length) : 50;
  const partyUnity = allyF.length > 0 ? Math.round(allyF.reduce((s, f) => s + (f.unity || 50), 0) / allyF.length) : 50;

  return <>
    {/* Party stats */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 8 }}>
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 2 }}>Party Approval</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: partyApproval >= 60 ? "#1D9E75" : partyApproval < 40 ? "#E24B4A" : "var(--color-text-primary)" }}>{partyApproval}%</div>
        <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>avg faction relationship</div>
      </div>
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 2 }}>Party Unity</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: partyUnity >= 60 ? "#1D9E75" : partyUnity < 40 ? "#E24B4A" : "#EF9F27" }}>{partyUnity}</div>
        <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>avg faction unity</div>
      </div>
    </div>

    <SectionHeader label="Coalition Factions" />
    {allyF.map(f => {
      const supportedBills = POLICY_ACTIONS.filter(a =>
        (a.factionReactions[f.id] || 0) > 0.5 &&
        !usedPol.has(a.id) &&
        !(billCooldowns[a.id] && week < billCooldowns[a.id])
      );
      const activePromise = promises.find(p => p.factionId === f.id);
      return (
        <div key={f.id} style={{ marginBottom: 6, padding: "8px 10px", borderRadius: "var(--border-radius-lg)", border: f.id === pf ? `2px solid ${f.color}` : "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: f.color }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{f.name}</span>
              {f.id === pf && <Badge color={f.color}>Base</Badge>}
            </div>
            <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{f.senateSeats}S {f.houseSeats}H</span>
          </div>
          {f.leader && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Leader: <b style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{f.leader.name}</b></span>
              <div style={{ display: "flex", gap: 3 }}>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#3b82f611", color: "#2563eb" }}>Chr {f.leader.charisma}</span>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#8b5cf611", color: "#7c3aed" }}>Auth {f.leader.authority}</span>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#10b98111", color: "#059669" }}>Sin {f.leader.sincerity}</span>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginBottom: 4, fontSize: 10 }}>
            <span style={{ color: "var(--color-text-secondary)" }}>Rel <b style={{ color: f.unity > 60 ? "#1D9E75" : f.unity < 40 ? "#E24B4A" : "var(--color-text-primary)" }}>{Math.round(f.relationship)}</b></span>
            <span style={{ color: "var(--color-text-secondary)" }}>Trust <b style={{ color: "var(--color-text-primary)" }}>{Math.round(f.trust)}</b></span>
            <span style={{ color: "var(--color-text-secondary)" }}>Unity <b style={{ color: f.unity > 60 ? "#1D9E75" : f.unity < 40 ? "#E24B4A" : "#EF9F27" }}>{Math.round(f.unity || 50)}</b></span>
          </div>
          {factionHist[f.id]?.rel?.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <div><div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 1 }}>Rel</div><MiniChart data={factionHist[f.id].rel} color="#378ADD" h={24} w={56} /></div>
              <div><div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 1 }}>Trust</div><MiniChart data={factionHist[f.id].trust} color="#1D9E75" h={24} w={56} /></div>
              <div><div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 1 }}>Unity</div><MiniChart data={factionHist[f.id].unity} color="#EF9F27" h={24} w={56} /></div>
            </div>
          )}
          {/* Promise section */}
          <div style={{ marginTop: 5, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 5 }}>
            {activePromise ? (
              <div style={{ fontSize: 9, color: "#EF9F27" }}>
                Promise: pass "{POLICY_ACTIONS.find(a => a.id === activePromise.billId)?.name}" by wk {activePromise.deadline} ({Math.max(0, activePromise.deadline - week)} wks left)
              </div>
            ) : supportedBills.length > 0 ? (
              <div>
                <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 3 }}>Promise to pass this year:</div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {supportedBills.slice(0, 3).map(bill => {
                    const controversy = Object.values(bill.factionReactions).reduce((s, v) => s + Math.abs(v), 0) / Object.keys(bill.factionReactions).length;
                    const relBoost = Math.max(3, Math.round(controversy * 12));
                    return (
                      <button key={bill.id} onClick={() => onMakePromise(f.id, bill.id, relBoost)} style={{
                        fontSize: 9, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                        background: "#EF9F2722", color: "#EF9F27", border: "1px solid #EF9F2744",
                      }}>
                        {bill.name.split(" ").slice(0, 3).join(" ")}… (+{relBoost} rel)
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>No available bills this faction supports</div>
            )}
          </div>
        </div>
      );
    })}

    <SectionHeader label="Surrogates" />
    {surrogates.map(s => {
      const ui = surrogateUI[s.id] || {};
      const coachAvailable = coachCooldown === 0 || week >= coachCooldown;
      const coachWeeksLeft = coachAvailable ? 0 : coachCooldown - week;
      return (
        <div key={s.id} style={{ marginBottom: 6, padding: "8px 10px", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{s.name}</span>
              <span style={{ fontSize: 9, color: "var(--color-text-secondary)", marginLeft: 5 }}>{s.title}</span>
            </div>
            {s.busy && <Badge color="#EF9F27">Busy</Badge>}
          </div>
          {s.busy ? (
            <div style={{ fontSize: 10, color: "#EF9F27" }}>{s.busy.description} — {s.busy.weeksLeft} wk{s.busy.weeksLeft !== 1 ? "s" : ""} remaining</div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 4 }}>
                {(s.title === "Campaign Director" ? ["visit", "faction_rel", "coach"] : ["visit", "faction_rel", "foreign_visit"]).map(taskType => (
                  <button key={taskType} onClick={() => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], tab: taskType } }))} style={{
                    fontSize: 9, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                    background: ui.tab === taskType ? "var(--color-text-primary)" : "var(--color-background-secondary)",
                    color: ui.tab === taskType ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                    border: "none",
                  }}>{taskType === "faction_rel" ? "Relations" : taskType === "visit" ? "State Visit" : taskType === "coach" ? "Coach" : "Foreign Visit"}</button>
                ))}
              </div>
              {ui.tab === "visit" && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Visits a random state</span>
                  <button onClick={() => onAssignSurrogate(s.id, { type: "visit" })} disabled={act >= 4}
                    style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "none", cursor: act >= 4 ? "not-allowed" : "pointer", background: "var(--color-text-primary)", color: "var(--color-background-primary)", opacity: act >= 4 ? 0.5 : 1 }}>
                    Send (1 action)
                  </button>
                </div>
              )}
              {ui.tab === "faction_rel" && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={ui.factionId || ""} onChange={e => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], factionId: e.target.value } }))} style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4 }}>
                    <option value="">Faction…</option>
                    {allF.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <button onClick={() => {
                    if (!ui.factionId || act >= 4) return;
                    const f = cg.factions[ui.factionId];
                    const relBonus = 5 + Math.floor(Math.random() * 11);
                    onAssignSurrogate(s.id, { type: "faction_rel", factionId: ui.factionId, factionName: f?.name, relBonus, description: `Improving relations with ${f?.name}`, weeksLeft: 4 });
                  }} disabled={!ui.factionId || act >= 4}
                    style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "none", cursor: (!ui.factionId || act >= 4) ? "not-allowed" : "pointer", background: "var(--color-text-primary)", color: "var(--color-background-primary)", opacity: (!ui.factionId || act >= 4) ? 0.5 : 1 }}>
                    Assign (1 action, 4 wks)
                  </button>
                </div>
              )}
              {ui.tab === "foreign_visit" && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={ui.countryId || ""} onChange={e => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], countryId: e.target.value } }))} style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4 }}>
                    <option value="">Country…</option>
                    {countries.filter(c => c.status !== "HOSTILE" && !(visitedCountries[c.id] && week < visitedCountries[c.id])).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={() => {
                    if (!ui.countryId || act >= 4) return;
                    const c = countries.find(ct => ct.id === ui.countryId);
                    onAssignSurrogate(s.id, { type: "foreign_visit", countryId: ui.countryId, countryName: c?.name, description: `Foreign visit to ${c?.name}`, weeksLeft: 1 });
                  }} disabled={!ui.countryId || act >= 4}
                    style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "none", cursor: (!ui.countryId || act >= 4) ? "not-allowed" : "pointer", background: "var(--color-text-primary)", color: "var(--color-background-primary)", opacity: (!ui.countryId || act >= 4) ? 0.5 : 1 }}>
                    Send (1 action)
                  </button>
                </div>
              )}
              {ui.tab === "coach" && (
                <div>
                  {!coachAvailable ? (
                    <div style={{ fontSize: 10, color: "#EF9F27" }}>Available in {coachWeeksLeft} wk{coachWeeksLeft !== 1 ? "s" : ""}</div>
                  ) : (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                      <select value={ui.coachFactionId || ""} onChange={e => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], coachFactionId: e.target.value } }))} style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4 }}>
                        <option value="">Faction…</option>
                        {allyF.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                      <select value={ui.coachSkill || ""} onChange={e => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], coachSkill: e.target.value } }))} style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4 }}>
                        <option value="">Skill…</option>
                        <option value="charisma">Charisma</option>
                        <option value="authority">Authority</option>
                      </select>
                      <button onClick={() => {
                        if (!ui.coachFactionId || !ui.coachSkill || act >= 4) return;
                        const f = cg.factions[ui.coachFactionId];
                        onAssignSurrogate(s.id, { type: "coach", factionId: ui.coachFactionId, factionName: f?.name, skill: ui.coachSkill, description: `Coaching ${f?.name} leader's ${ui.coachSkill}`, weeksLeft: 4 });
                      }} disabled={!ui.coachFactionId || !ui.coachSkill || act >= 4}
                        style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "none", cursor: (!ui.coachFactionId || !ui.coachSkill || act >= 4) ? "not-allowed" : "pointer", background: "var(--color-text-primary)", color: "var(--color-background-primary)", opacity: (!ui.coachFactionId || !ui.coachSkill || act >= 4) ? 0.5 : 1 }}>
                        Coach (1 action, 4 wks, 66%)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    })}

    {promises.length > 0 && <>
      <SectionHeader label="Active Promises" />
      {promises.map((p, i) => {
        const bill = POLICY_ACTIONS.find(a => a.id === p.billId);
        const faction = cg.factions[p.factionId];
        const weeksLeft = p.deadline - week;
        const fulfilled = usedPol.has(p.billId);
        return (
          <div key={i} style={{ marginBottom: 4, padding: "6px 10px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 10 }}>
              <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{faction?.name}</span>
              <span style={{ color: "var(--color-text-secondary)" }}> — pass "{bill?.name}"</span>
            </div>
            <div style={{ fontSize: 9, color: fulfilled ? "#1D9E75" : weeksLeft < 4 ? "#E24B4A" : "#EF9F27" }}>
              {fulfilled ? "✓ Fulfilled" : `Due wk ${p.deadline} (${weeksLeft}w)`}
            </div>
          </div>
        );
      })}
    </>}
  </>;
}
