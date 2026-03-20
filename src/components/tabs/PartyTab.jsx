import { POLICY_ACTIONS } from "../../data/policies.js";
import SectionHeader from "../SectionHeader.jsx";

// ── Shared styles ─────────────────────────────────────────────────────────────

const panelStyle = {
  background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-lg)",
  overflow: "hidden",
};

// ── PartyTab ──────────────────────────────────────────────────────────────────

export default function PartyTab({
  allF, allyF, cg, pf,
  promises, promiseOffers, passedLegislation, week,
  surrogates, surrogateUI, setSurrogateUI,
  coachCooldown, countries, visitedCountries, act, maxActions,
  onMakePromise, onAssignSurrogate,
  campaignMetrics,
}) {
  const partyApproval = allyF.length > 0
    ? Math.round(allyF.reduce((s, f) => s + f.relationship, 0) / allyF.length)
    : 50;
  const partyUnity = allyF.length > 0
    ? Math.round(allyF.reduce((s, f) => s + (f.unity || 50), 0) / allyF.length)
    : 50;

  return (
    <>
      {/* Party stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div style={panelStyle}>
          <div style={{ padding: "10px 14px" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.11em", color: "var(--color-text-secondary)", marginBottom: 4 }}>
              Party Approval
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
              {partyApproval}%
            </div>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginTop: 2 }}>
              avg faction relationship
            </div>
          </div>
        </div>
        <div style={panelStyle}>
          <div style={{ padding: "10px 14px" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.11em", color: "var(--color-text-secondary)", marginBottom: 4 }}>
              Party Unity
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
              {partyUnity}
            </div>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginTop: 2 }}>
              avg faction unity
            </div>
          </div>
        </div>
      </div>

      {campaignMetrics && <CampaignWidget metrics={campaignMetrics} />}

      <SectionHeader label="Coalition Factions" />

      {allyF.map(f => {
        const activePromise = promises.find(p => p.factionId === f.id);
        const offers        = promiseOffers[f.id] || [];
        const isBase        = f.id === pf;

        return (
          <div key={f.id} style={{
            marginBottom: 6,
            padding: "10px 12px",
            borderRadius: "var(--border-radius-lg)",
            border: isBase
              ? "1px solid var(--color-border-secondary)"
              : "0.5px solid var(--color-border-tertiary)",
            background: isBase
              ? "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))"
              : "var(--color-background-primary)",
          }}>
            {/* Name + seats */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {f.name}
                </span>
                {isBase && (
                  <span style={{ fontSize: 8, color: "var(--color-text-secondary)", marginLeft: 6 }}>Base</span>
                )}
              </div>
              <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>
                {f.senateSeats}S · {f.houseSeats}H
              </span>
            </div>

            {/* Leader */}
            {f.leader && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 6, fontSize: 9,
              }}>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  Leader: <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{f.leader.name}</span>
                </span>
                <div style={{ display: "flex", gap: 8, color: "var(--color-text-secondary)" }}>
                  <span>Chr {f.leader.charisma}</span>
                  <span>Auth {f.leader.authority}</span>
                  <span>Sin {f.leader.sincerity}</span>
                </div>
              </div>
            )}

            {/* Rel / Trust / Unity bars */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px", marginBottom: 6 }}>
              {[
                { label: "Rel",   value: f.relationship ?? 50 },
                { label: "Trust", value: f.trust        ?? 50 },
                { label: "Unity", value: f.unity        ?? 50 },
              ].map(({ label, value }) => (
                <div key={label} style={{ marginBottom: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: 9 }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{Math.round(value)}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: "var(--color-background-tertiary)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round(value)}%`, background: "var(--color-text-secondary)", opacity: 0.45, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Promise section */}
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 6 }}>
              {activePromise ? (
                <div style={{ fontSize: 9, color: "#EF9F27" }}>
                  Promise:{" "}
                  {activePromise.type === "cabinet"
                    ? `appoint Secretary of State from ${activePromise.promisedFactionName}`
                    : `pass "${activePromise.billName}"`}{" "}
                  by wk {activePromise.deadline} ({Math.max(0, activePromise.deadline - week)} wks left)
                </div>
              ) : offers.length > 0 ? (
                <div>
                  <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                    Promise to pass this year:
                  </div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {offers.map(offer => (
                      <button
                        key={`${f.id}-${offer.type}-${offer.billId || offer.officeId}-${offer.promisedFactionId || ""}`}
                        onClick={() => onMakePromise(f.id, offer)}
                        style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                          background: "transparent",
                          color: "#EF9F27",
                          border: "0.5px solid #EF9F2766",
                        }}
                      >
                        {offer.type === "cabinet"
                          ? `SecState: ${offer.promisedFactionName.split(" ")[0]}`
                          : `${offer.billName.split(" ").slice(0, 3).join(" ")}…`
                        }{" "}(+{offer.relBoost} rel)
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>
                  No available promise this year
                </div>
              )}
            </div>
          </div>
        );
      })}

      <SectionHeader label="Surrogates" />

      {surrogates.map(s => {
        const ui              = surrogateUI[s.id] || {};
        const coachAvailable  = coachCooldown === 0 || week >= coachCooldown;
        const coachWeeksLeft  = coachAvailable ? 0 : coachCooldown - week;
        const taskTypes       = s.title === "Campaign Director"
          ? ["visit", "faction_rel", "coach"]
          : ["visit", "faction_rel", "foreign_visit"];

        return (
          <div key={s.id} style={{
            marginBottom: 6, padding: "10px 12px",
            borderRadius: "var(--border-radius-lg)",
            border: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-primary)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: s.busy ? 6 : 4 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{s.name}</span>
                <span style={{ fontSize: 9, color: "var(--color-text-secondary)", marginLeft: 5 }}>{s.title}</span>
              </div>
              {s.busy && (
                <span style={{ fontSize: 9, color: "#EF9F27" }}>Busy</span>
              )}
            </div>

            {s.busy ? (
              <div style={{ fontSize: 10, color: "#EF9F27" }}>
                {s.busy.description} — {s.busy.weeksLeft} wk{s.busy.weeksLeft !== 1 ? "s" : ""} remaining
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
                  {taskTypes.map(taskType => (
                    <button
                      key={taskType}
                      onClick={() => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], tab: taskType } }))}
                      style={{
                        fontSize: 9, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                        background: ui.tab === taskType ? "var(--color-text-primary)" : "var(--color-background-secondary)",
                        color: ui.tab === taskType ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                        border: "none",
                      }}
                    >
                      {taskType === "faction_rel" ? "Relations"
                        : taskType === "visit" ? "State Visit"
                        : taskType === "coach" ? "Coach"
                        : "Foreign Visit"}
                    </button>
                  ))}
                </div>

                {ui.tab === "visit" && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Visits a random state</span>
                    <button
                      onClick={() => onAssignSurrogate(s.id, { type: "visit" })}
                      disabled={act >= maxActions}
                      style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 4, border: "none",
                        cursor: act >= maxActions ? "not-allowed" : "pointer",
                        background: "var(--color-text-primary)", color: "var(--color-background-primary)",
                        opacity: act >= maxActions ? 0.5 : 1,
                      }}
                    >
                      Send (1 action)
                    </button>
                  </div>
                )}

                {ui.tab === "faction_rel" && (
                  <div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 5 }}>
                      {allF.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], factionId: f.id } }))}
                          style={{
                            fontSize: 9, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                            border: `0.5px solid ${ui.factionId === f.id ? "var(--color-text-secondary)" : "transparent"}`,
                            background: ui.factionId === f.id ? "var(--color-background-secondary)" : "var(--color-background-secondary)",
                            color: ui.factionId === f.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                          }}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        if (!ui.factionId || act >= maxActions) return;
                        const f = cg.factions[ui.factionId];
                        const relBonus = 5 + Math.floor(Math.random() * 11);
                        onAssignSurrogate(s.id, {
                          type: "faction_rel", factionId: ui.factionId,
                          factionName: f?.name, relBonus,
                          description: `Improving relations with ${f?.name}`, weeksLeft: 4,
                        });
                      }}
                      disabled={!ui.factionId || act >= maxActions}
                      style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 4, border: "none",
                        cursor: (!ui.factionId || act >= maxActions) ? "not-allowed" : "pointer",
                        background: "var(--color-text-primary)", color: "var(--color-background-primary)",
                        opacity: (!ui.factionId || act >= maxActions) ? 0.5 : 1,
                      }}
                    >
                      Assign (1 action, 4 wks)
                    </button>
                  </div>
                )}

                {ui.tab === "foreign_visit" && (
                  <div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 5 }}>
                      {countries
                        .filter(c => c.status !== "HOSTILE" && !(visitedCountries[c.id] && week < visitedCountries[c.id]))
                        .map(c => (
                          <button
                            key={c.id}
                            onClick={() => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], countryId: c.id } }))}
                            style={{
                              fontSize: 9, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                              border: `0.5px solid ${ui.countryId === c.id ? "var(--color-text-secondary)" : "transparent"}`,
                              background: "var(--color-background-secondary)",
                              color: ui.countryId === c.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                            }}
                          >
                            {c.name}
                          </button>
                        ))
                      }
                    </div>
                    <button
                      onClick={() => {
                        if (!ui.countryId || act >= maxActions) return;
                        const c = countries.find(ct => ct.id === ui.countryId);
                        onAssignSurrogate(s.id, {
                          type: "foreign_visit", countryId: ui.countryId,
                          countryName: c?.name,
                          description: `Foreign visit to ${c?.name}`, weeksLeft: 1,
                        });
                      }}
                      disabled={!ui.countryId || act >= maxActions}
                      style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 4, border: "none",
                        cursor: (!ui.countryId || act >= maxActions) ? "not-allowed" : "pointer",
                        background: "var(--color-text-primary)", color: "var(--color-background-primary)",
                        opacity: (!ui.countryId || act >= maxActions) ? 0.5 : 1,
                      }}
                    >
                      Send (1 action)
                    </button>
                  </div>
                )}

                {ui.tab === "coach" && (
                  <div>
                    {!coachAvailable ? (
                      <div style={{ fontSize: 9, color: "#EF9F27" }}>
                        Available in {coachWeeksLeft} wk{coachWeeksLeft !== 1 ? "s" : ""}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 4 }}>
                          {allyF.map(f => (
                            <button
                              key={f.id}
                              onClick={() => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], coachFactionId: f.id } }))}
                              style={{
                                fontSize: 9, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                                border: `0.5px solid ${ui.coachFactionId === f.id ? "var(--color-text-secondary)" : "transparent"}`,
                                background: "var(--color-background-secondary)",
                                color: ui.coachFactionId === f.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                              }}
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
                          {["charisma", "authority"].map(skill => (
                            <button
                              key={skill}
                              onClick={() => setSurrogateUI(p => ({ ...p, [s.id]: { ...p[s.id], coachSkill: skill } }))}
                              style={{
                                fontSize: 9, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                                border: `0.5px solid ${ui.coachSkill === skill ? "var(--color-text-secondary)" : "transparent"}`,
                                background: "var(--color-background-secondary)",
                                color: ui.coachSkill === skill ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                              }}
                            >
                              {skill.charAt(0).toUpperCase() + skill.slice(1)}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            if (!ui.coachFactionId || !ui.coachSkill || act >= maxActions) return;
                            const f = cg.factions[ui.coachFactionId];
                            onAssignSurrogate(s.id, {
                              type: "coach", factionId: ui.coachFactionId,
                              factionName: f?.name, skill: ui.coachSkill,
                              description: `Coaching ${f?.name} leader's ${ui.coachSkill}`, weeksLeft: 4,
                            });
                          }}
                          disabled={!ui.coachFactionId || !ui.coachSkill || act >= maxActions}
                          style={{
                            fontSize: 9, padding: "2px 8px", borderRadius: 4, border: "none",
                            cursor: (!ui.coachFactionId || !ui.coachSkill || act >= maxActions) ? "not-allowed" : "pointer",
                            background: "var(--color-text-primary)", color: "var(--color-background-primary)",
                            opacity: (!ui.coachFactionId || !ui.coachSkill || act >= maxActions) ? 0.5 : 1,
                          }}
                        >
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

      {promises.length > 0 && (
        <>
          <SectionHeader label="Active Promises" />
          {promises.map((p, i) => {
            const bill      = POLICY_ACTIONS.find(a => a.id === p.billId);
            const faction   = cg.factions[p.factionId];
            const weeksLeft = p.deadline - week;
            const fulfilled = p.type === "bill" ? !!passedLegislation[p.billId] : false;
            return (
              <div
                key={i}
                style={{
                  marginBottom: 4, padding: "7px 11px",
                  borderRadius: "var(--border-radius-md)",
                  background: "var(--color-background-secondary)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <div style={{ fontSize: 10 }}>
                  <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{faction?.name}</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    {" — "}{p.type === "cabinet"
                      ? `appoint Secretary of State from ${p.promisedFactionName}`
                      : `pass "${bill?.name}"`}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: fulfilled ? "#1D9E75" : weeksLeft < 4 ? "#E24B4A" : "#EF9F27", whiteSpace: "nowrap" }}>
                  {fulfilled ? "✓ Fulfilled" : `Due wk ${p.deadline} (${weeksLeft}w)`}
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

// ── Campaign widget ───────────────────────────────────────────────────────────

function CampaignWidget({ metrics }) {
  const { partyEnthusiasm, oppEnthusiasm, projectedHouseChange, projectedSenateChange, advice, weeksUntilElection } = metrics;
  const houseGain  = projectedHouseChange  >= 0;
  const senateGain = projectedSenateChange >= 0;

  return (
    <div style={{
      marginBottom: 10, padding: "10px 12px",
      borderRadius: "var(--border-radius-lg)",
      border: "0.5px solid var(--color-border-secondary)",
      background: "var(--color-background-secondary)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>
          Campaign Season
        </span>
        <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>
          {weeksUntilElection === 0
            ? "Election this week"
            : `${weeksUntilElection} week${weeksUntilElection !== 1 ? "s" : ""} to election`}
        </span>
      </div>

      {/* Enthusiasm */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 10 }}>
        <span style={{ color: "var(--color-text-secondary)" }}>
          Your Enthusiasm: <b style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>{Math.round(partyEnthusiasm)}</b>
        </span>
        <span style={{ color: "var(--color-text-secondary)" }}>
          Opposition: <b style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>{Math.round(oppEnthusiasm)}</b>
        </span>
      </div>

      {/* Projections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        {[
          { label: "House (projected)", value: projectedHouseChange, gain: houseGain },
          { label: "Senate (projected)", value: projectedSenateChange, gain: senateGain },
        ].map(({ label, value, gain }) => (
          <div key={label} style={{
            padding: "6px 10px", borderRadius: 4, textAlign: "center",
            border: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-primary)",
          }}>
            <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 3 }}>
              {label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: gain ? "#1D9E75" : "#E24B4A" }}>
              {gain ? "+" : ""}{value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 9, color: "var(--color-text-secondary)", fontStyle: "italic", marginBottom: 4 }}>{advice}</div>
      <div style={{ fontSize: 9, color: "var(--color-text-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 5 }}>
        Boost enthusiasm via surrogate lobbying, state visits, and fulfilling faction promises.
      </div>
    </div>
  );
}
