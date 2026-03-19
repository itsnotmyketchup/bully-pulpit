import { BILL_AMENDMENTS, BILL_LOCKS } from "../data/policies.js";
import { STATE_DATA } from "../data/states.js";
import { clampRel } from "../utils/clamp.js";
import { applyCountryDelta, applyCountryEffectToAll, applyCountryEffects } from "./countryMutations.js";
import { applyEffectsBundle, applyStateActionEffects, syncDerivedStats } from "./effectResolution.js";
import {
  adjustFaction,
  applyRelationshipEffects,
  applyTrustEffects,
  cloneFactions,
} from "./factionMutations.js";
import { getPromiseLabel } from "./promiseResolution.js";

function queueDelayedPolicyEffects(queue, source, week, mult = 1) {
  const nextQueue = [...queue];
  if (source.delayedEffects) {
    nextQueue.push({
      week: week + source.delayedEffects.weeks,
      name: `${source.name} (delayed)`,
      effects: Object.fromEntries(Object.entries(source.delayedEffects.effects || {}).map(([key, value]) => [key, value * mult])),
      macroEffects: Object.fromEntries(Object.entries(source.delayedMacroEffects?.effects || {}).map(([key, value]) => [key, value * mult])),
    });
  } else if (source.delayedMacroEffects) {
    nextQueue.push({
      week: week + source.delayedMacroEffects.weeks,
      name: `${source.name} (delayed)`,
      effects: {},
      macroEffects: Object.fromEntries(Object.entries(source.delayedMacroEffects.effects || {}).map(([key, value]) => [key, value * mult])),
    });
  }
  return nextQueue;
}

export function resolveEventChoice({
  stats,
  macroState,
  factions,
  countries,
  stBon,
  curEv,
  choice,
  week,
  buildAppointmentProcess,
  pickFedChairName,
  nameRegistry,
}) {
  let nextStats = { ...stats };
  let nextMacroState = { ...macroState, impulses: { ...macroState.impulses } };
  ({ stats: nextStats, macroState: nextMacroState } = applyEffectsBundle(nextStats, nextMacroState, choice.effects || {}, { ...curEv, macroEffects: choice.macroEffects || {} }));

  const nextFactions = cloneFactions(factions);
  if (choice.factionEffects) applyRelationshipEffects(nextFactions, choice.factionEffects, 8);

  const nextCountries = choice.countryEffects ? applyCountryEffects(countries, choice.countryEffects) : countries;
  const nextStateBonuses = { ...stBon };
  if (choice.stateBoost && curEv.affectedStates) {
    curEv.affectedStates.forEach((abbr) => {
      nextStateBonuses[abbr] = (nextStateBonuses[abbr] || 0) + choice.stateBoost;
    });
  }

  const result = {
    stats: syncDerivedStats(nextStats, nextMacroState),
    macroState: nextMacroState,
    factions: nextFactions,
    countries: nextCountries,
    stBon: nextStateBonuses,
    engagement: curEv.engagementEffect ? Math.max(0, Math.min(50, curEv.engagementEffect)) : null,
    globalTensionDelta: choice.tensionEffect || 0,
    pendingAppointment: null,
    logs: [`${curEv.name}: ${choice.result}`],
    notifications: [],
    pendingChainEvent: null,
    recentDisasterWeek: curEv.isDisaster ? week : null,
  };

  if (choice.schedulesChain) {
    const { minDelay, maxDelay, outcomes } = choice.schedulesChain;
    const delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
    const roll = Math.random();
    let cumulative = 0;
    let chosenEvent = outcomes[outcomes.length - 1].event;
    for (const outcome of outcomes) {
      cumulative += outcome.probability;
      if (roll < cumulative) {
        chosenEvent = outcome.event;
        break;
      }
    }
    result.pendingChainEvent = { triggerAtWeek: week + delay, event: chosenEvent };
  }

  if (choice.fedGovernorChoice) {
    const nomineeName = choice.fedGovernorName || pickFedChairName(nameRegistry);
    result.pendingAppointment = buildAppointmentProcess({
      officeId: "fed_chair",
      officeLabel: "Federal Reserve Chair",
      nomineeName,
      personality: choice.fedGovernorChoice,
    });
    result.macroState = {
      ...result.macroState,
      fedVacant: true,
      fedDecisionSummary: `${nomineeName} is moving through the Senate confirmation process.`,
    };
    result.stats = syncDerivedStats(result.stats, result.macroState);
    result.logs.unshift(`${nomineeName} was sent to the Senate as a ${choice.fedGovernorChoice.toLowerCase()} Fed chair.`);
    result.notifications.push({ type: "fed_update", message: `${nomineeName} is now in the Fed confirmation process.`, tab: "cabinet" });
  }

  return result;
}

export function resolveBillProposal({ action, factions, alliedFactionIds, calcStageAdvance, cg, playerFaction }) {
  const nextFactions = cloneFactions(factions);
  const allies = new Set(alliedFactionIds || []);
  Object.entries(action.factionReactions).forEach(([factionId, reaction]) => {
    if (!nextFactions[factionId]) return;
    const isAlly = allies.has(factionId);
    adjustFaction(nextFactions, factionId, {
      relationship: reaction >= 0 ? reaction * (isAlly ? 4 : 3) : reaction * (isAlly ? 9 : 3),
      trust: reaction >= 0 ? reaction * (isAlly ? 2 : 1) : reaction * (isAlly ? 6 : 1),
    });
  });

  const updatedCg = { ...cg, factions: nextFactions };
  const initialResult = calcStageAdvance(action, updatedCg, "committee", playerFaction, false);
  return {
    cg: updatedCg,
    activeBill: { act: action, stage: "committee", fails: 0, turnsInStage: 0, consecutiveFails: 0 },
    billLikelihood: initialResult.passLikelihood,
    billFactionVotes: initialResult.factionVotes || null,
    log: `${action.name} introduced — entering committee`,
  };
}

export function resolvePromiseConfirmation({ pendingPromise, week, factions }) {
  const { factionId, relBoost } = pendingPromise;
  const nextFactions = cloneFactions(factions);
  adjustFaction(nextFactions, factionId, { relationship: relBoost });
  return {
    factions: nextFactions,
    promise: { ...pendingPromise, factionId, madeWeek: week, deadline: Math.ceil(week / 52) * 52 },
    log: `Promised ${factions[factionId]?.name}: will ${getPromiseLabel(pendingPromise)} by year end. Relationship +${relBoost}.`,
  };
}

export function resolveForeignVisit({
  country,
  countryId,
  factions,
  countries,
  stats,
  macroState,
  actionCost,
  factionEffects,
}) {
  const relGain = Math.floor(Math.random() * 11);
  const trustGain = Math.floor(Math.random() * 11);
  const nextStats = { ...stats };
  if (relGain >= 5) nextStats.approvalRating = (nextStats.approvalRating || 50) + 2;

  const nextCountries = countries.map((entry) => (
    entry.id === countryId ? applyCountryDelta(entry, { relationship: relGain, trust: trustGain }) : entry
  ));
  const nextFactions = cloneFactions(factions);
  applyRelationshipEffects(nextFactions, factionEffects, 8);

  return {
    stats: syncDerivedStats(nextStats, macroState),
    countries: nextCountries,
    factions: nextFactions,
    engagement: 4,
    actionCost,
    result: {
      countryName: country.name,
      relGain,
      trustGain,
      approvalGain: relGain >= 5 ? 2 : 0,
      factionLines: Object.entries(factionEffects).map(([factionId, value]) => {
        const faction = factions[factionId];
        return faction ? `${faction.name.split(" ")[0]}: ${value > 0 ? "+" : ""}${Math.round(value * 8)} rel` : null;
      }).filter(Boolean),
    },
    log: `Presidential visit to ${country.name}: +${relGain} relationship, +${trustGain} trust.`,
  };
}

export function resolveExecutiveOrder({
  eo,
  extraData,
  week,
  count,
  stats,
  macroState,
  factions,
  countries,
  stBon,
  activeOrders,
  executiveOverreach,
  oppositionFactionIds,
  buildExecutiveOrderOutcome,
  drillingRegionStateMap,
}) {
  const mult = eo.repeatable ? Math.max(0.3, 1 / (1 + count * 0.5)) : 1;
  const outcome = buildExecutiveOrderOutcome(eo, extraData);
  let nextStats = { ...stats };
  let nextMacroState = { ...macroState, impulses: { ...macroState.impulses } };
  ({ stats: nextStats, macroState: nextMacroState } = applyEffectsBundle(nextStats, nextMacroState, outcome.effects || {}, outcome, mult));

  const nextFactions = cloneFactions(factions);
  applyRelationshipEffects(nextFactions, outcome.factionReactions, 8 * mult);
  const controversyPenalty = eo.controversy * -6;
  (oppositionFactionIds || []).forEach((factionId) => {
    if (!nextFactions[factionId]) return;
    if (outcome.factionReactions[factionId] == null || outcome.factionReactions[factionId] >= 0) {
      adjustFaction(nextFactions, factionId, { relationship: controversyPenalty });
    }
  });

  let nextCountries = countries;
  if (eo.countryEffect?.targetAll) {
    nextCountries = applyCountryEffectToAll(nextCountries, { relationship: eo.countryEffect.relationship * mult });
  }
  if (eo.choiceType === "country" && extraData.targetCountryId) {
    nextCountries = nextCountries.map((country) => (
      country.id === extraData.targetCountryId ? applyCountryDelta(country, { relationship: -18, trust: -12 }) : country
    ));
    if (extraData.targetCountryId === "china") {
      nextMacroState = applyEffectsBundle(nextStats, nextMacroState, {}, { macroEffects: { investment: -0.04, nx: -0.03, confidence: -0.02 } }).macroState;
      nextStats = syncDerivedStats(nextStats, nextMacroState);
    }
  }

  const nextStateBonuses = outcome.stateEffects
    ? applyStateActionEffects(stBon, { stateEffects: { ...outcome.stateEffects, weight: (outcome.stateEffects.weight || 0) * mult } }, STATE_DATA, drillingRegionStateMap)
    : { ...stBon };

  const nextOverreach = Math.min(100, executiveOverreach + (eo.controversy === 0 ? 0 : 3 + 5 * eo.controversy));
  const nextQueue = queueDelayedPolicyEffects([], { ...outcome, name: eo.name }, week, mult);

  const factionLines = Object.entries(outcome.factionReactions || {}).map(([factionId, value]) => {
    const faction = nextFactions[factionId];
    const actual = Math.round(value * 8 * mult);
    return faction && actual !== 0 ? { name: faction.name, val: actual } : null;
  }).filter(Boolean);
  const oppositionLines = (oppositionFactionIds || [])
    .filter((factionId) => outcome.factionReactions[factionId] == null || outcome.factionReactions[factionId] >= 0)
    .map((factionId) => {
      const faction = nextFactions[factionId];
      return faction ? { name: faction.name, val: Math.round(controversyPenalty) } : null;
    })
    .filter(Boolean);

  return {
    stats: syncDerivedStats(nextStats, nextMacroState),
    macroState: nextMacroState,
    factions: nextFactions,
    countries: nextCountries,
    stBon: nextStateBonuses,
    pFx: nextQueue,
    activeOrders: [...activeOrders, { id: eo.id, name: eo.name, issuedWeek: week, active: true, choiceData: extraData }],
    overreach: nextOverreach,
    log: `EXECUTIVE ORDER: "${eo.name}" signed.${outcome.delayedEffects || outcome.delayedMacroEffects ? ` Effects delayed ${(outcome.delayedEffects?.weeks || outcome.delayedMacroEffects?.weeks)} weeks.` : ""}`,
    eoResult: {
      eo: {
        ...eo,
        effects: outcome.effects,
        delayedEffects: outcome.delayedEffects,
        macroEffects: outcome.macroEffects,
        delayedMacroEffects: outcome.delayedMacroEffects,
      },
      mult,
      factionLines: [...factionLines, ...oppositionLines.filter((line) => !factionLines.find((existing) => existing.name === line.name))],
      extraData,
    },
    engagementDelta: eo.id === "tariffs" ? -10 : 0,
    maxActions: eo.id === "executive_office_optimization" ? 5 : null,
  };
}

export function resolveSignedBill({
  pendingSignature,
  stats,
  macroState,
  pFx,
  stBon,
  countries,
  factions,
  executiveOverreach,
  week,
  playerParty,
}) {
  const { act, votes, isBudget, budgetDraft } = pendingSignature;
  let nextStats = { ...stats };
  let nextMacroState = macroState;
  let nextQueue = [...pFx];
  let nextStateBonuses = { ...stBon };
  let nextCountries = countries;

  if (isBudget) {
    ["corporateTaxRate","incomeTaxLow","incomeTaxMid","incomeTaxHigh","payrollTaxRate","militarySpending","educationSpending","healthcareSpending","socialSecuritySpending","infrastructureSpending","otherSpending"]
      .forEach((key) => { if (budgetDraft[key] != null) nextStats[key] = stats[key] * (1 + budgetDraft[key]); });
    nextStats.approvalRating = (nextStats.approvalRating || 50) + 1.5;
  } else {
    ({ stats: nextStats, macroState: nextMacroState } = applyEffectsBundle(
      nextStats,
      { ...macroState, impulses: { ...macroState.impulses } },
      Object.fromEntries(Object.entries(act.effects).filter(([key]) => !["crimeRate"].includes(key))),
      act
    ));
    nextStats.approvalRating = (nextStats.approvalRating || 50) + 1.5;
    if (act.delayedEffects || act.delayedMacroEffects) {
      nextQueue.push({
        name: act.name,
        effects: act.delayedEffects?.effects || {},
        macroEffects: act.delayedMacroEffects?.effects || {},
        week: week + (act.delayedEffects?.weeks || act.delayedMacroEffects?.weeks || 9),
      });
    }
    Object.entries(act.effects).forEach(([key, value]) => {
      if (key === "crimeRate") nextQueue.push({ name: act.name, effects: { [key]: value }, macroEffects: {}, week: week + 9 });
    });
    nextStateBonuses = applyStateActionEffects(nextStateBonuses, act, STATE_DATA);
    if (act.countryEffects) nextCountries = applyCountryEffects(nextCountries, act.countryEffects);
  }

  const nextFactions = cloneFactions(factions);
  if (isBudget) applyRelationshipEffects(nextFactions, act.factionReactions, 6);
  const allyIds = (playerParty ? ({ DEM: ["prog","mod_dem","blue_dog"], REP: ["freedom","mod_rep","trad_con"] }[playerParty] || []) : []);
  const allyOpposers = allyIds.filter((factionId) => (act.factionReactions[factionId] || 0) < -0.2);
  const logs = [];
  if (allyOpposers.length >= 3) {
    allyIds.forEach((factionId) => adjustFaction(nextFactions, factionId, { unity: -15, relationship: -12 }));
    logs.push(`Your party's three factions strongly opposed ${act.name}. Party unity collapses.`);
  } else if (allyOpposers.length === 2) {
    allyOpposers.forEach((factionId) => adjustFaction(nextFactions, factionId, { unity: -10, relationship: -7 }));
    logs.push(`Two party factions strongly opposed ${act.name}. Unity damaged.`);
  } else if (allyOpposers.length === 1) {
    allyOpposers.forEach((factionId) => adjustFaction(nextFactions, factionId, { unity: -5, relationship: -3 }));
  }

  const amendments = (BILL_AMENDMENTS[act.id] || []).filter((amendment) => (pendingSignature.appliedAmendments || []).includes(amendment.id));
  return {
    stats: syncDerivedStats(nextStats, nextMacroState),
    macroState: nextMacroState,
    pFx: nextQueue,
    stBon: nextStateBonuses,
    countries: nextCountries,
    factions: nextFactions,
    billRecordEntry: {
      name: act.name,
      week,
      passed: true,
      senateYes: votes.senateYes,
      senateNo: votes.senateNo,
      houseYes: votes.houseYes,
      houseNo: votes.houseNo,
      amendments,
    },
    locks: BILL_LOCKS[act.id] || [],
    overreach: Math.max(0, executiveOverreach - 3),
    powerProjectionDelta: act.id === "defense_mod" ? 5 : (act.powerProjectionEffect || 0),
    engagementDelta: act.engagementEffect || 0,
    reconciliationCooldown: isBudget ? week + 52 : null,
    log: `${act.name} SIGNED INTO LAW by President ${pendingSignature.presidentName || ""}`.trim(),
    extraLogs: logs,
  };
}

export function resolveVetoedBill({ pendingSignature, factions, stats, macroState, week }) {
  const { act, votes } = pendingSignature;
  const nextFactions = cloneFactions(factions);
  Object.entries(act.factionReactions).forEach(([factionId, reaction]) => {
    if (reaction > 0.2) adjustFaction(nextFactions, factionId, { relationship: -15, unity: -8 });
    else if (reaction < -0.2) adjustFaction(nextFactions, factionId, { relationship: 10, unity: 5 });
  });

  return {
    factions: nextFactions,
    stats: syncDerivedStats({ ...stats, approvalRating: clampRel(stats.approvalRating - 2) }, macroState),
    billRecordEntry: {
      name: act.name,
      week,
      passed: false,
      vetoed: true,
      senateYes: votes.senateYes,
      senateNo: votes.senateNo,
      houseYes: votes.houseYes,
      houseNo: votes.houseNo,
    },
    log: `${act.name} VETOED`,
  };
}

export function resolveSpeech({ pos, stats, macroState, factions, speechTopic, topics, alliedFactionIds }) {
  const nextStats = { ...stats };
  if (pos.approvalSwing) nextStats.approvalRating += pos.approvalSwing;
  const nextFactions = cloneFactions(factions);
  if (pos.factionEffects) {
    applyRelationshipEffects(nextFactions, pos.factionEffects, 6);
    applyTrustEffects(nextFactions, pos.factionEffects, 2);
  }
  const allyNet = (alliedFactionIds || []).reduce((sum, factionId) => sum + (pos.factionEffects?.[factionId] || 0), 0);
  if (allyNet > 0.3) (alliedFactionIds || []).forEach((factionId) => adjustFaction(nextFactions, factionId, { unity: 2 }));
  else if (allyNet < -0.3) (alliedFactionIds || []).forEach((factionId) => adjustFaction(nextFactions, factionId, { unity: -2 }));

  return {
    stats: syncDerivedStats(nextStats, macroState),
    factions: nextFactions,
    log: `Speech on ${topics.find((topic) => topic.id === speechTopic)?.name ?? speechTopic}: "${pos.label}"`,
  };
}
