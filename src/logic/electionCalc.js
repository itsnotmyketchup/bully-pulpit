import { POLICY_ACTIONS } from "../data/policies.js";
import { ALLIED_FACTIONS, OPPOSITION_FACTIONS } from "../data/constants.js";
import { clamp } from "../utils/clamp.js";

const CAMPAIGN_SEASON_WEEKS = 16;

function getCampaignEnthusiasmPenalty(activityScore = 0) {
  if (activityScore >= CAMPAIGN_SEASON_WEEKS) return 0;
  if (activityScore >= 12) return 5;
  if (activityScore >= 8) return 12;
  if (activityScore >= 4) return 20;
  return 28;
}

function getCampaignSeatPenalty(activityScore = 0) {
  if (activityScore >= CAMPAIGN_SEASON_WEEKS) return 0;
  if (activityScore >= 12) return 6;
  if (activityScore >= 8) return 16;
  if (activityScore >= 4) return 28;
  return 40;
}

// ─── Enthusiasm Calculation ───────────────────────────────────────────────────

export function computeEnthusiasms(cg, pp, natA, executiveOverreach, passedLegislation, promises, activityScore = 0) {
  const allyIds = ALLIED_FACTIONS[pp] || [];
  const oppoIds = OPPOSITION_FACTIONS[pp] || [];
  const allyFactions = allyIds.map(id => cg.factions[id]).filter(Boolean);
  const oppoFactions = oppoIds.map(id => cg.factions[id]).filter(Boolean);

  // ── Party enthusiasm ──────────────────────────────────────────────────────
  const avgRel = allyFactions.reduce((s, f) => s + f.relationship, 0) / (allyFactions.length || 1);
  const avgUnity = allyFactions.reduce((s, f) => s + (f.unity || 50), 0) / (allyFactions.length || 1);
  const relScore = (avgRel - 5) / 90;       // 0–1
  const unityScore = (avgUnity - 20) / 75;  // 0–1

  // Promises fulfilled bonus: promises where the bill was passed
  const fulfilledCount = promises.filter(p => passedLegislation[p.billId]).length;
  const promiseBonus = Math.min(6, fulfilledCount * 2);

  // Legislation ally supporters: bills where avg ally factionReaction > 0.3
  const passedBillIds = Object.keys(passedLegislation);
  const allyFavouredCount = passedBillIds.filter(id => {
    const bill = POLICY_ACTIONS.find(a => a.id === id);
    if (!bill) return false;
    const avgReact = allyIds.reduce((s, fid) => s + (bill.factionReactions?.[fid] || 0), 0) / (allyIds.length || 1);
    return avgReact > 0.3;
  }).length;
  const legBonus = Math.min(8, allyFavouredCount * 3);

  // Activity penalty: low player engagement during campaign season suppresses enthusiasm
  const activityPenalty = getCampaignEnthusiasmPenalty(activityScore);

  const partyEnthusiasm = clamp(relScore * 45 + unityScore * 35 + promiseBonus + legBonus - activityPenalty, 0, 100);

  // ── Opposition enthusiasm ─────────────────────────────────────────────────
  const oppAvgUnity = oppoFactions.reduce((s, f) => s + (f.unity || 50), 0) / (oppoFactions.length || 1);
  const oppAvgRel = oppoFactions.reduce((s, f) => s + f.relationship, 0) / (oppoFactions.length || 1);
  const oppUnityScore = (oppAvgUnity - 20) / 75;
  const relFrustration = (95 - oppAvgRel) / 90; // low opp relationship = more motivated

  const overreachBoost = (executiveOverreach / 100) * 25;

  // Legislation anger: bills where avg oppo factionReaction < -0.3
  const angerBillCount = passedBillIds.filter(id => {
    const bill = POLICY_ACTIONS.find(a => a.id === id);
    if (!bill) return false;
    const avgReact = oppoIds.reduce((s, fid) => s + (bill.factionReactions?.[fid] || 0), 0) / (oppoIds.length || 1);
    return avgReact < -0.3;
  }).length;
  const angerBonus = Math.min(15, angerBillCount * 4);

  const oppEnthusiasm = clamp(oppUnityScore * 30 + relFrustration * 30 + overreachBoost + angerBonus, 0, 100);

  return { partyEnthusiasm, oppEnthusiasm };
}

// ─── Seat Change Calculation ──────────────────────────────────────────────────

export function computeSeatChanges(cg, pp, natA, partyEnthusiasm, oppEnthusiasm, isPresidentialYear = false, activityScore = 0) {
  const allyIds = ALLIED_FACTIONS[pp] || [];
  const oppoIds = OPPOSITION_FACTIONS[pp] || [];
  const allyFactions = allyIds.map(id => cg.factions[id]).filter(Boolean);
  const oppoFactions = oppoIds.map(id => cg.factions[id]).filter(Boolean);

  const allyHouseTotal = allyFactions.reduce((s, f) => s + (f.houseSeats || 0), 0);
  const allySenateTotal = allyFactions.reduce((s, f) => s + (f.senateSeats || 0), 0);

  // Net score: approval matters 70%, enthusiasm differential 30%
  const approvalFactor = (natA - 50) / 50;       // -1.0 to +1.0
  const enthDiff = (partyEnthusiasm - oppEnthusiasm) / 100;
  const netScore = approvalFactor * 0.70 + enthDiff * 0.30;

  // Structural midterm penalty; no penalty in presidential election years
  const structuralPenalty = isPresidentialYear ? 0 : -12;

  // Direct inactivity penalty: low campaign activity suppresses turnout and costs seats
  const directActivityPenalty = getCampaignSeatPenalty(activityScore);

  const jitterH = Math.round((Math.random() - 0.5) * 8);
  const rawHouseChange = Math.round(structuralPenalty - directActivityPenalty + netScore * 70);
  const houseNetChange = clamp(
    rawHouseChange + jitterH,
    Math.max(-allyHouseTotal + 3, -90),
    45
  );

  const jitterS = Math.round((Math.random() - 0.5) * 2);
  const rawSenateChange = Math.round(rawHouseChange * 0.10);
  const senateNetChange = clamp(
    rawSenateChange + jitterS,
    Math.max(-allySenateTotal + 1, -10),
    7
  );

  // Distribute changes among factions
  const factionHouseChanges = _distributeFactionChanges(allyFactions, oppoFactions, houseNetChange, "houseSeats");
  const factionSenateChanges = _distributeFactionChanges(allyFactions, oppoFactions, senateNetChange, "senateSeats");

  return { houseNetChange, senateNetChange, factionHouseChanges, factionSenateChanges };
}

function _distributeFactionChanges(allyFactions, oppoFactions, netChange, seatKey) {
  const allyTotal = allyFactions.reduce((s, f) => s + (f[seatKey] || 0), 0);
  const changes = {};
  if (allyTotal === 0) return changes;

  // Charisma-adjusted weights for ally factions
  const weights = {};
  allyFactions.forEach(f => {
    const charisma = f.leader?.charisma || 5;
    const charismaFactor = (charisma - 5.5) / 4.5;
    const seatShare = (f[seatKey] || 0) / allyTotal;
    if (netChange < 0) {
      weights[f.id] = Math.max(0.01, seatShare * (1 - charismaFactor * 0.3));
    } else {
      weights[f.id] = Math.max(0.01, seatShare * (1 + charismaFactor * 0.3));
    }
  });

  const totalWeight = allyFactions.reduce((s, f) => s + weights[f.id], 0);
  allyFactions.forEach(f => {
    changes[f.id] = Math.round(netChange * (weights[f.id] / totalWeight));
  });

  // Rounding correction on largest ally faction
  const allocated = allyFactions.reduce((s, f) => s + (changes[f.id] || 0), 0);
  const remainder = netChange - allocated;
  if (remainder !== 0 && allyFactions.length > 0) {
    const largest = allyFactions.reduce((a, b) => (b[seatKey] || 0) > (a[seatKey] || 0) ? b : a);
    changes[largest.id] = (changes[largest.id] || 0) + remainder;
  }

  // Mirror changes to opposition
  const oppoTotal = oppoFactions.reduce((s, f) => s + (f[seatKey] || 0), 0);
  if (oppoTotal > 0) {
    oppoFactions.forEach(f => {
      changes[f.id] = -Math.round(netChange * ((f[seatKey] || 0) / oppoTotal));
    });
    // Rounding correction for opposition
    const oppoAllocated = oppoFactions.reduce((s, f) => s + (changes[f.id] || 0), 0);
    const oppoRemainder = -netChange - oppoAllocated;
    if (oppoRemainder !== 0 && oppoFactions.length > 0) {
      const oppoLargest = oppoFactions.reduce((a, b) => (b[seatKey] || 0) > (a[seatKey] || 0) ? b : a);
      changes[oppoLargest.id] = (changes[oppoLargest.id] || 0) + oppoRemainder;
    }
  }

  return changes;
}

// ─── Apply post-election seat updates ────────────────────────────────────────

export function applyElectionSeats(factions, factionHouseChanges, factionSenateChanges) {
  const updated = {};
  Object.entries(factions).forEach(([id, f]) => {
    const hDelta = factionHouseChanges[id] || 0;
    const sDelta = factionSenateChanges[id] || 0;
    updated[id] = {
      ...f,
      houseSeats: Math.max(1, (f.houseSeats || 0) + hDelta),
      senateSeats: Math.max(0, (f.senateSeats || 0) + sDelta),
    };
  });
  return _ensureSeatIntegrity(updated, 435, 100);
}

function _ensureSeatIntegrity(factions, targetHouse, targetSenate) {
  const fac = { ...factions };
  const ids = Object.keys(fac);

  const houseSum = ids.reduce((s, id) => s + (fac[id].houseSeats || 0), 0);
  if (houseSum !== targetHouse) {
    const diff = targetHouse - houseSum;
    const largestH = ids.reduce((a, b) => (fac[b].houseSeats || 0) > (fac[a].houseSeats || 0) ? b : a);
    fac[largestH] = { ...fac[largestH], houseSeats: Math.max(1, (fac[largestH].houseSeats || 0) + diff) };
  }

  const senateSum = ids.reduce((s, id) => s + (fac[id].senateSeats || 0), 0);
  if (senateSum !== targetSenate) {
    const diff = targetSenate - senateSum;
    const largestS = ids.reduce((a, b) => (fac[b].senateSeats || 0) > (fac[a].senateSeats || 0) ? b : a);
    fac[largestS] = { ...fac[largestS], senateSeats: Math.max(0, (fac[largestS].senateSeats || 0) + diff) };
  }

  return fac;
}

// ─── Post-election relationship effects ──────────────────────────────────────

export function applyPostElectionRelEffects(factions, houseNetChange, pp) {
  const allyIds = ALLIED_FACTIONS[pp] || [];
  const newFactions = { ...factions };

  allyIds.forEach(fid => {
    if (!newFactions[fid]) return;
    let relChange = 0;
    if (houseNetChange > 40) relChange = 12;
    else if (houseNetChange > 10) relChange = 8;
    else if (houseNetChange < -40) relChange = -12;

    if (relChange !== 0) {
      newFactions[fid] = {
        ...newFactions[fid],
        relationship: clamp((newFactions[fid].relationship || 50) + relChange, 5, 95),
      };
    }
  });

  return newFactions;
}

// ─── Build results payload ────────────────────────────────────────────────────

export function buildMidtermResults(cg, pp, yr, natA, partyEnthusiasm, oppEnthusiasm, houseNetChange, senateNetChange, factionHouseChanges, factionSenateChanges, isPresidentialYear) {
  const allFactions = Object.values(cg.factions);

  const factionBreakdown = allFactions.map(f => ({
    id: f.id,
    name: f.name,
    color: f.color,
    party: f.party,
    oldHouse: f.houseSeats || 0,
    newHouse: Math.max(1, (f.houseSeats || 0) + (factionHouseChanges[f.id] || 0)),
    oldSenate: f.senateSeats || 0,
    newSenate: Math.max(0, (f.senateSeats || 0) + (factionSenateChanges[f.id] || 0)),
    houseChange: factionHouseChanges[f.id] || 0,
    senateChange: factionSenateChanges[f.id] || 0,
  }));

  return {
    yr,
    pp,
    partyEnthusiasm: Math.round(partyEnthusiasm),
    oppEnthusiasm: Math.round(oppEnthusiasm),
    approvalAtElection: Math.round(natA),
    houseNetChange,
    senateNetChange,
    factionBreakdown,
    isPresidentialYear: !!isPresidentialYear,
  };
}

// ─── Build congress history snapshot ─────────────────────────────────────────

export function buildHistorySnapshot(cg, yr, houseNetChange, senateNetChange, partyEnthusiasm, oppEnthusiasm, approvalAtElection, isPresidentialYear, options = {}) {
  const factions = {};
  Object.values(cg.factions).forEach(f => {
    factions[f.id] = {
      id: f.id,
      name: f.name,
      color: f.color,
      party: f.party,
      senateSeats: f.senateSeats || 0,
      houseSeats: f.houseSeats || 0,
    };
  });

  return {
    yr,
    pp: cg.pp,
    houseNetChange,
    senateNetChange,
    partyEnthusiasm: Math.round(partyEnthusiasm),
    oppEnthusiasm: Math.round(oppEnthusiasm),
    approvalAtElection: Math.round(approvalAtElection),
    isPresidentialYear: !!isPresidentialYear,
    isInitial: !!options.isInitial,
    factions,
  };
}

// ─── Campaign season metrics (for live widget display) ───────────────────────

export function computePollingProjection(partyEnthusiasm, oppEnthusiasm, natA, pollingNoise, isPresidentialYear = false, activityScore = 0) {
  const approvalFactor = (natA - 50) / 50;
  const enthDiff = (partyEnthusiasm - oppEnthusiasm) / 100;
  const netScore = approvalFactor * 0.70 + enthDiff * 0.30;
  const structuralPenalty = isPresidentialYear ? 0 : -12;

  const directActivityPenalty = getCampaignSeatPenalty(activityScore);

  const projectedHouseChange = Math.round(structuralPenalty - directActivityPenalty + (netScore + pollingNoise) * 70);
  const projectedSenateChange = Math.round(projectedHouseChange * 0.10);

  let advice;
  if (projectedHouseChange < -40) {
    advice = "Catastrophic losses projected. Rally the base urgently — boost faction relations and fulfill promises.";
  } else if (projectedHouseChange < -20) {
    advice = "Significant losses expected. Shore up party enthusiasm through lobbying and fulfilled commitments.";
  } else if (projectedHouseChange < -5) {
    advice = isPresidentialYear
      ? "Modest losses projected. Presidential coattails not guaranteed — engage voters now."
      : "Modest losses projected — typical for a midterm. Maintain momentum into election week.";
  } else if (projectedHouseChange < 10) {
    advice = "Near-neutral projection. Strong approval could still produce a modest gain.";
  } else {
    advice = "Gains are possible! Keep party enthusiasm high and approval above 50%.";
  }

  return { projectedHouseChange, projectedSenateChange, advice };
}
