/**
 * Calculate whether a bill advances to the next stage this turn.
 *
 * Returns { advance, score, passLikelihood, votes, factionVotes, totalSenate, totalHouse, senateThreshold }
 *
 * Non-reconciliation chamber votes require a 60-vote Senate supermajority (filibuster).
 * Reconciliation bills use simple majority in all stages.
 *
 * Vote calculation per faction (split voting, modulated by unity):
 *  - voteProb computed from normalizedReaction + relModifier (same as before)
 *  - unity: faction's current unity / 100
 *  - if voteProb > 0.5: adjustedYesFrac = voteProb + (1 - voteProb) * unity * 0.5
 *  - if voteProb <= 0.5: adjustedYesFrac = voteProb * (1 - unity * 0.5)
 */

import { clamp } from "../utils/clamp.js";

export function calcStageAdvance(bill, congress, stage, playerFactionId = null, isReconciliation = false) {
  const factions = Object.values(congress.factions);
  const totalSenate = factions.reduce((s, f) => s + f.senateSeats, 0);
  const totalHouse = factions.reduce((s, f) => s + f.houseSeats, 0);

  let senateYes = 0, houseYes = 0;
  const factionVotes = [];

  factions.forEach(f => {
    let reaction = bill.factionReactions[f.id];
    if (reaction == null) reaction = -0.35;

    // Loyalty nudge: player's base faction slightly more supportive if trust+relationship are high
    if (f.id === playerFactionId) {
      const trust = (f.trust || 50) / 100;
      const rel = (f.relationship || 50) / 100;
      if (trust > 0.7 && rel > 0.7) {
        reaction += 0.1;
      }
    }

    reaction = clamp(reaction, -1, 1);

    // Normalize reaction from [-1,1] to [0,1]
    const normalizedReaction = (reaction + 1) / 2;

    // Relationship and trust modifiers
    const rel = (f.relationship || 50) / 100;
    const trust = (f.trust || 50) / 100;
    const relModifier = (rel - 0.5) * 0.15 + (trust - 0.5) * 0.1;

    const voteProb = clamp(normalizedReaction + relModifier, 0, 1);

    // Split voting modulated by unity
    const unity = (f.unity || 50) / 100;
    let senYesFrac, houYesFrac;
    if (voteProb > 0.5) {
      const yFrac = voteProb + (1 - voteProb) * unity * 0.5;
      senYesFrac = yFrac;
      houYesFrac = yFrac;
    } else {
      const yFrac = voteProb * (1 - unity * 0.5);
      senYesFrac = yFrac;
      houYesFrac = yFrac;
    }

    const senYes = Math.max(0, Math.min(f.senateSeats, Math.round(f.senateSeats * senYesFrac)));
    const houYes = Math.max(0, Math.min(f.houseSeats, Math.round(f.houseSeats * houYesFrac)));

    senateYes += senYes;
    houseYes += houYes;

    factionVotes.push({
      fid: f.id,
      name: f.name,
      voteProb,
      unity: f.unity || 50,
      senateSeats: f.senateSeats,
      houseSeats: f.houseSeats,
      senateYes: senYes,
      houseYes: houYes,
    });
  });

  const senateFrac = totalSenate > 0 ? senateYes / totalSenate : 0;
  const houseFrac = totalHouse > 0 ? houseYes / totalHouse : 0;
  const overall = (senateFrac + houseFrac) / 2;

  // For non-reconciliation chamber votes, require 60-vote Senate supermajority (filibuster)
  const isChamberVote = stage === "first_chamber" || stage === "second_chamber";
  const senateThreshold = (!isReconciliation && isChamberVote) ? 0.60 : 0.50;

  const stageDifficulty = {
    committee: 0.40,
    first_chamber: 0.50,
    second_chamber: 0.50,
    reconciliation: 0.51,
  };

  const threshold = stageDifficulty[stage] || 0.50;
  const noise = (Math.random() - 0.5) * 0.06;

  let advance;
  if (!isReconciliation && isChamberVote) {
    // Must clear senate filibuster AND house majority
    advance = (senateFrac + noise * 0.5 >= senateThreshold) && (houseFrac + noise * 0.5 >= 0.50);
  } else {
    advance = overall + noise >= threshold;
  }

  // passLikelihood reflects the bottleneck chamber
  let passLikelihood;
  if (!isReconciliation && isChamberVote) {
    const senateProgress = senateFrac / senateThreshold;
    const houseProgress = houseFrac / 0.50;
    passLikelihood = Math.round(clamp(Math.min(senateProgress, houseProgress) * 60, 0, 100));
  } else {
    passLikelihood = Math.round(clamp(50 + (overall - threshold) * 300, 0, 100));
  }

  return {
    advance,
    score: clamp(overall, 0, 1),
    passLikelihood,
    votes: {
      senateYes,
      senateNo: totalSenate - senateYes,
      houseYes,
      houseNo: totalHouse - houseYes,
    },
    factionVotes,
    totalSenate,
    totalHouse,
    senateThreshold,
  };
}
