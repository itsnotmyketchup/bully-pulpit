import { FACTION_DATA } from "../data/factions.js";
import { POLICY_ACTIONS } from "../data/policies.js";

export function buildYearlyPromiseOffers({ playerParty, usedPol, billCooldowns, week, cabinetState, pendingAppointment }) {
  const offers = {};
  const secStateAvailable = !cabinetState.secState.occupantName && pendingAppointment?.officeId !== "sec_state";

  FACTION_DATA[playerParty].forEach((faction) => {
    const billOptions = POLICY_ACTIONS
      .filter((action) => (action.factionReactions?.[faction.id] || 0) > 0 && !usedPol.has(action.id) && !(billCooldowns[action.id] && week < billCooldowns[action.id]))
      .sort((a, b) => (b.factionReactions?.[faction.id] || 0) - (a.factionReactions?.[faction.id] || 0))
      .slice(0, 4)
      .map((action) => {
        const controversy = Object.values(action.factionReactions).reduce((sum, value) => sum + Math.abs(value), 0) / Object.keys(action.factionReactions).length;
        return {
          type: "bill",
          billId: action.id,
          billName: action.name,
          label: `Pass "${action.name}"`,
          relBoost: Math.max(3, Math.round(controversy * 12)),
          brokenRelPenalty: 10,
          brokenTrustPenalty: 15,
          successTrustBoost: 5,
        };
      });

    const cabinetOption = secStateAvailable ? [{
      type: "cabinet",
      officeId: "sec_state",
      officeLabel: "Secretary of State",
      promisedFactionId: faction.id,
      promisedFactionName: faction.name,
      label: `Give Secretary of State to ${faction.name}`,
      relBoost: 8,
      brokenRelPenalty: 12,
      brokenTrustPenalty: 20,
      betrayalRelPenalty: 18,
      betrayalTrustPenalty: 35,
      successTrustBoost: 8,
    }] : [];

    const candidatePool = [...billOptions, ...cabinetOption];
    offers[faction.id] = candidatePool.length > 0
      ? candidatePool.sort(() => Math.random() - 0.5).slice(0, Math.min(2, candidatePool.length))
      : [];
  });

  return offers;
}
