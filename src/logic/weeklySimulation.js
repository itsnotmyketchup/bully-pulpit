import { STATE_DATA } from "../data/states.js";
import { POLICY_ACTIONS, BILL_AMENDMENTS, BILL_STAGES } from "../data/policies.js";
import {
  generateDynamicEvents,
  isDisasterCheckWeek,
  rollEligibleSpecialEvents,
} from "../data/events.js";
import { clamp, clampUni } from "../utils/clamp.js";
import { cloneFactions, adjustFaction, pushFactionHistory } from "./factionMutations.js";
import { cloneCountries } from "./countryMutations.js";
import { applyEffectsBundle, syncDerivedStats } from "./effectResolution.js";
import { getPromiseLabel, settleSecStatePromises } from "./promiseResolution.js";

const RANDOM_EVENT_CHECKS_PER_YEAR = 13;
const DISASTER_EVENT_CHECKS_PER_YEAR = 8;
const SPECIAL_COOLDOWN_WEEKS = 4;

function chooseHighestPriorityEvent(events, rng = Math.random) {
  if (events.length === 0) return null;
  const topPriority = Math.max(...events.map((event) => event.priority || 0));
  const contenders = events.filter((event) => (event.priority || 0) === topPriority);
  return contenders[Math.floor(rng() * contenders.length)];
}

function cloneSnapshot(snapshot) {
  return {
    ...snapshot,
    stats: { ...snapshot.stats },
    prev: { ...snapshot.prev },
    macroState: { ...snapshot.macroState, impulses: { ...snapshot.macroState.impulses } },
    cg: { ...snapshot.cg, factions: cloneFactions(snapshot.cg?.factions || {}) },
    countries: cloneCountries(snapshot.countries || []),
    stBon: { ...snapshot.stBon },
    stateHist: { ...snapshot.stateHist },
    pFx: [...(snapshot.pFx || [])],
    usedEv: new Set(snapshot.usedEv || []),
    usedPol: new Set(snapshot.usedPol || []),
    activeBill: snapshot.activeBill ? { ...snapshot.activeBill, act: { ...snapshot.activeBill.act } } : null,
    pendingAppointment: snapshot.pendingAppointment ? { ...snapshot.pendingAppointment } : null,
    pendingSignature: snapshot.pendingSignature ? { ...snapshot.pendingSignature } : null,
    pendingNegotiation: snapshot.pendingNegotiation ? { ...snapshot.pendingNegotiation } : null,
    pendingCongressUpdate: snapshot.pendingCongressUpdate ? { ...snapshot.pendingCongressUpdate } : null,
    promises: [...(snapshot.promises || [])],
    billCooldowns: { ...snapshot.billCooldowns },
    visitedCountries: { ...snapshot.visitedCountries },
    activeOrders: [...(snapshot.activeOrders || [])],
    eoIssuedCount: { ...snapshot.eoIssuedCount },
    passedLegislation: { ...snapshot.passedLegislation },
    countryStatusSnapshot: { ...snapshot.countryStatusSnapshot },
    diplomacyThresholds: { ...snapshot.diplomacyThresholds },
    pendingChainEvents: [...(snapshot.pendingChainEvents || [])],
    visitTypeCounts: {},
    billRecord: [...(snapshot.billRecord || [])],
    appliedAmendments: { ...snapshot.appliedAmendments },
    factionHist: { ...snapshot.factionHist },
    cabinet: {
      ...snapshot.cabinet,
      secState: { ...snapshot.cabinet.secState, candidates: [...(snapshot.cabinet.secState?.candidates || [])] },
    },
    surrogates: [...(snapshot.surrogates || [])],
    reconciliationCooldown: snapshot.reconciliationCooldown || 0,
    confirmationHistory: [...(snapshot.confirmationHistory || [])],
    congressHistory: [...(snapshot.congressHistory || [])],
    notifications: [...(snapshot.notifications || [])],
    brokenPromises: [...(snapshot.brokenPromises || [])],
    recentDisasters: { ...snapshot.recentDisasters },
    coachCooldown: snapshot.coachCooldown || 0,
    log: [...(snapshot.log || [])],
  };
}

function createContext(snapshot, deps) {
  return {
    state: cloneSnapshot(snapshot),
    deps,
    runtime: {
      nextWeek: snapshot.week + 1,
      inauguratedFactions: null,
      leaderReplace: [],
      billPassed: false,
      billDied: false,
      billFactionReactions: null,
      readyForEvent: true,
    },
    sideEffects: {
      logs: [],
      notifications: [],
    },
  };
}

function pushLog(context, text) {
  context.sideEffects.logs.push({ week: context.state.week, text });
}

function pushNotification(context, notification) {
  context.sideEffects.notifications.push({
    id: Date.now() + Math.random(),
    addedWeek: context.state.week,
    ...notification,
  });
}

export function advanceEconomyPhase(context) {
  const { state, deps, runtime } = context;
  const nextWeek = runtime.nextWeek;
  const weekOfYearPre = ((nextWeek - 1) % 52) + 1;

  if (weekOfYearPre === 1 && state.pendingCongressUpdate) {
    runtime.inauguratedFactions = state.pendingCongressUpdate.newFactions;
    state.showInaugurationModal = true;
    const netH = state.pendingCongressUpdate.houseNetChange;
    const netS = state.pendingCongressUpdate.senateNetChange;
    state.pendingCongressUpdate = null;
    pushLog(context, `New Congress sworn in. Party ${netH >= 0 ? "gained" : "lost"} ${Math.abs(netH)} House seat${Math.abs(netH) !== 1 ? "s" : ""} and ${netS >= 0 ? "gained" : "lost"} ${Math.abs(netS)} Senate seat${Math.abs(netS) !== 1 ? "s" : ""}.`);
  }

  state.prev = { ...state.stats };
  const advancedMacro = deps.advanceMacroEconomy(state.macroState, state.stats, nextWeek);
  state.macroState = advancedMacro.macroState;
  if (Math.abs(state.macroState.fedFundsRate - context.deps.previousMacroState.fedFundsRate) > 0.049) {
    const rateDelta = state.macroState.fedFundsRate - context.deps.previousMacroState.fedFundsRate;
    pushNotification(context, {
      type: "fed_update",
      message: `${state.macroState.fedChairName} ${rateDelta > 0 ? "raised" : "cut"} rates to ${state.macroState.fedFundsRate.toFixed(2)}%.`,
      tab: "cabinet",
    });
    pushLog(context, `Federal Reserve ${rateDelta > 0 ? "raised" : "cut"} rates to ${state.macroState.fedFundsRate.toFixed(2)}%.`);
  }

  state.stats.birthRate = Math.max(6, state.stats.birthRate * (1 - 0.015 / 52));
  state.stats.deathRate = Math.max(7, Math.min(12, 9.0 + (1520 - state.stats.healthcareSpending) / 1520 * 0.6));
  const naturalGrowthPerWeek = (state.stats.birthRate - state.stats.deathRate) / 1000 * state.stats.population / 52;
  const immigrationPerWeek = state.stats.immigrationRate * 1e6 / 52;
  state.stats.population = Math.round(state.stats.population + naturalGrowthPerWeek + immigrationPerWeek);
  state.stats.unemployment = advancedMacro.derived.unemployment;
  state.stats.inflation = advancedMacro.derived.inflation;
  state.stats.gasPrice = Math.max(2, Math.min(7, state.stats.gasPrice + (Math.random() - 0.5) * 0.02));
  state.stats.crimeRate = Math.max(2, Math.min(10, state.stats.crimeRate + (Math.random() - 0.5) * 0.01));
  state.stats.tradeBalance = Math.max(-180, Math.min(40, state.stats.tradeBalance - state.macroState.outputGap * 0.45 + state.macroState.netExportsShare * 20 + (Math.random() - 0.5) * 0.4));
  const immEconDrift = (state.macroState.realGdpGrowth - 2.5) * 0.003 - (state.stats.unemployment - 5) * 0.002;
  state.stats.immigrationRate = Math.max(0.1, Math.min(3.5, state.stats.immigrationRate + immEconDrift + (Math.random() - 0.5) * 0.01));

  const queuedEffects = [];
  state.pFx.forEach((policyEffect) => {
    if (policyEffect.week <= nextWeek) {
      const applied = applyEffectsBundle(state.stats, state.macroState, policyEffect.effects || {}, policyEffect);
      state.stats = applied.stats;
      state.macroState = applied.macroState;
      pushLog(context, `Policy effect: ${policyEffect.name}`);
      return;
    }
    queuedEffects.push(policyEffect);
  });
  state.pFx = queuedEffects;
  state.stats = syncDerivedStats(state.stats, state.macroState);

  const year = Math.ceil(nextWeek / 52);
  const weekOfYear = ((nextWeek - 1) % 52) + 1;
  const isElectionYear = year >= 2 && year % 2 === 0;
  const isPresidentialYear = year >= 4 && year % 4 === 0;
  if (weekOfYear === 28 && isElectionYear && !state.campaignSeasonStarted) {
    state.campaignSeasonStarted = true;
    state.campaignActivity = 0;
    state.pollingNoise = (Math.random() - 0.5) * 0.30;
    state.isPresidentialElection = isPresidentialYear;
    pushNotification(context, {
      type: "election_warning",
      message: isPresidentialYear
        ? `Year ${year} election campaign begins — elections in 16 weeks. Presidential race not simulated; Congressional seats will be updated.`
        : `Year ${year} midterm campaign season begins — elections in 16 weeks. Use surrogates and visits to boost party enthusiasm.`,
      tab: "party",
    });
    pushLog(context, `Year ${year} ${isPresidentialYear ? "election" : "midterm"} campaign season begins.`);
  }
}

export function advanceCongressPhase(context) {
  const { state, deps, runtime } = context;
  const factions = cloneFactions(runtime.inauguratedFactions || state.cg.factions);
  state.cg = { ...state.cg, factions };

  let negWalkAwayFactionId = null;
  if (state.pendingNegotiation) {
    negWalkAwayFactionId = state.pendingNegotiation.eligibleFactionIds?.[0] || null;
    state.pendingNegotiation = null;
  }

  Object.keys(factions).forEach((factionId) => {
    adjustFaction(factions, factionId, { unity: (Math.random() * 6) - 3 });
    if ((factions[factionId].unity || 0) < 25) {
      const newLeader = {
        name: deps.drawName("Leader"),
        charisma: 1 + Math.floor(Math.random() * 10),
        authority: 1 + Math.floor(Math.random() * 10),
        sincerity: 1 + Math.floor(Math.random() * 10),
      };
      factions[factionId] = { ...factions[factionId], leader: newLeader, unity: clampUni((factions[factionId].unity || 0) + 15) };
      runtime.leaderReplace.push({ faction: factions[factionId].name, leader: newLeader.name });
    }
  });

  if (deps.playerFaction && factions[deps.playerFaction]) {
    const approval = context.deps.currentApproval;
    if (approval > 55) adjustFaction(factions, deps.playerFaction, { unity: 2 });
    else if (approval < 40) adjustFaction(factions, deps.playerFaction, { unity: -3 });
  }

  if (state.activeBill) {
    const stageIndex = BILL_STAGES.findIndex((stage) => stage.id === state.activeBill.stage);
    const result = deps.calcStageAdvance(state.activeBill.act, state.cg, state.activeBill.stage, deps.playerFaction, state.activeBill.isBudget || false);
    state.billLikelihood = result.passLikelihood;
    state.billFactionVotes = result.factionVotes || null;

    if (result.advance) {
      if (stageIndex >= BILL_STAGES.length - 1) {
        pushLog(context, `${state.activeBill.act.name} passed Congress — awaiting presidential signature`);
        state.pendingSignature = {
          act: state.activeBill.act,
          votes: result.votes,
          factionVotes: result.factionVotes || null,
          isBudget: state.activeBill.isBudget || false,
          budgetDraft: state.activeBill.budgetDraft || null,
        };
        state.activeBill = null;
        state.billLikelihood = null;
        state.billFactionVotes = null;
      } else {
        const nextStage = BILL_STAGES[stageIndex + 1].id;
        pushLog(context, `${state.activeBill.act.name} advanced to ${BILL_STAGES[stageIndex + 1].label}`);
        state.activeBill = { ...state.activeBill, stage: nextStage, turnsInStage: 0, consecutiveFails: 0, negotiated: false };
        const nextResult = deps.calcStageAdvance(state.activeBill.act, state.cg, nextStage, deps.playerFaction, state.activeBill.isBudget || false);
        state.billLikelihood = nextResult.passLikelihood;
        state.billFactionVotes = nextResult.factionVotes || null;
      }
    } else {
      const newConsecutiveFails = state.activeBill.consecutiveFails + 1;
      const newTotalFails = state.activeBill.fails + 1;
      pushLog(context, `${state.activeBill.act.name} stalled at ${BILL_STAGES[stageIndex].label} (${newConsecutiveFails}/3)`);

      if (newConsecutiveFails >= 3) {
        pushLog(context, `${state.activeBill.act.name} DIED IN CONGRESS after repeated failures`);
        state.stats.approvalRating = (state.stats.approvalRating || 50) - 2;
        runtime.billDied = true;
        runtime.billFactionReactions = state.activeBill.act.factionReactions;
        Object.keys(factions).forEach((factionId) => adjustFaction(factions, factionId, { trust: -3 }));
        state.billRecord = [...state.billRecord, {
          name: state.activeBill.act.name,
          week: state.week,
          passed: false,
          senateYes: result.votes.senateYes,
          senateNo: result.votes.senateNo,
          houseYes: result.votes.houseYes,
          houseNo: result.votes.houseNo,
        }];
        if (state.activeBill.isBudget) {
          state.reconciliationCooldown = state.week + 8;
          state.usedPol.delete("budget_reconciliation");
        } else {
          state.usedPol.delete(state.activeBill.act.id);
          state.billCooldowns = { ...state.billCooldowns, [state.activeBill.act.id]: state.week + 6 };
        }
        state.curEv = {
          name: `${state.activeBill.act.name} Dies in Congress`,
          desc: `After three consecutive failures to advance, ${state.activeBill.act.name} has been shelved.${state.activeBill.isBudget ? " You may try again in 8 weeks." : " You may attempt to reintroduce it in 6 weeks."}`,
          choices: [{ text: "Accept the setback and move on", result: "Bill abandoned", effects: {} }],
        };
        state.activeBill = null;
        state.billLikelihood = null;
      } else {
        const amendments = BILL_AMENDMENTS[state.activeBill.act.id];
        const alreadyApplied = state.appliedAmendments?.[state.activeBill.act.id] || [];
        const availableAmendments = amendments ? amendments.filter((amendment) => !alreadyApplied.includes(amendment.id)).slice(0, 2) : [];
        const eligibleFactionIds = availableAmendments.length > 0
          ? Object.values(state.cg.factions)
            .filter((faction) => {
              const reaction = state.activeBill.act.factionReactions[faction.id] ?? -0.35;
              return reaction >= -0.3 && reaction <= 0.3
                && (faction.relationship || 50) >= 35
                && (faction.trust || 50) >= 30;
            })
            .map((faction) => faction.id)
          : [];

        if (!state.activeBill.negotiated && eligibleFactionIds.length > 0) {
          state.pendingNegotiation = {
            amendments: availableAmendments,
            eligibleFactionIds,
            stage: state.activeBill.stage,
          };
          state.activeBill = {
            ...state.activeBill,
            fails: newTotalFails,
            consecutiveFails: newConsecutiveFails,
            turnsInStage: state.activeBill.turnsInStage + 1,
            negotiated: true,
          };
        } else {
          state.activeBill = {
            ...state.activeBill,
            fails: newTotalFails,
            consecutiveFails: newConsecutiveFails,
            turnsInStage: state.activeBill.turnsInStage + 1,
          };
        }
      }
    }
  }

  if (runtime.billFactionReactions) {
    Object.keys(factions).forEach((factionId) => {
      const reaction = runtime.billFactionReactions[factionId] || 0;
      const supports = reaction > 0.2;
      const opposes = reaction < -0.2;
      if (runtime.billPassed) {
        if (supports) adjustFaction(factions, factionId, { unity: 5 });
        if (opposes) adjustFaction(factions, factionId, { unity: -3 });
      } else if (runtime.billDied) {
        if (opposes) adjustFaction(factions, factionId, { unity: 3 });
        if (supports) adjustFaction(factions, factionId, { unity: -2 });
      }
    });
  }

  if (negWalkAwayFactionId && factions[negWalkAwayFactionId]) {
    adjustFaction(factions, negWalkAwayFactionId, { trust: -3 });
    pushLog(context, `Walked away from negotiations — trust with ${factions[negWalkAwayFactionId].name} decreased.`);
  }

  if (runtime.nextWeek % 2 === 0 && state.executiveOverreach > 31) {
    const t = Math.max(0, (state.executiveOverreach - 31)) / 69;
    (deps.alliedFactions || []).forEach((factionId) => {
      if (!factions[factionId]) return;
      const isBase = factionId === deps.playerFaction;
      const maxPenalty = isBase ? 2 : 4;
      const floor = isBase ? 45 : 25;
      factions[factionId] = {
        ...factions[factionId],
        relationship: Math.max(floor, factions[factionId].relationship - (t * maxPenalty)),
      };
    });
    (deps.oppositionFactions || []).forEach((factionId) => {
      if (!factions[factionId]) return;
      factions[factionId] = {
        ...factions[factionId],
        relationship: Math.max(10, factions[factionId].relationship - (t * 6)),
      };
    });
    if (t > 0.42) pushLog(context, "HIGH executive overreach is seriously damaging all faction relationships.");
    else if (t > 0.14) pushLog(context, "Elevated executive overreach is straining faction relationships.");
  }

  if (state.engagement > 30) ["prog", "mod_dem", "blue_dog", "mod_rep"].forEach((factionId) => adjustFaction(factions, factionId, { relationship: 0.15 }));
  if (state.engagement < 20) adjustFaction(factions, "freedom", { relationship: 0.15 });
  if (state.powerProjection > 38) ["mod_rep", "trad_con", "blue_dog"].forEach((factionId) => adjustFaction(factions, factionId, { relationship: 0.15 }));
  if (state.powerProjection < 32) adjustFaction(factions, "prog", { relationship: 0.15 });
  if (state.globalTension > 35) adjustFaction(factions, "prog", { relationship: -0.5 });

  runtime.leaderReplace.forEach(({ faction, leader }) => {
    pushLog(context, `${faction} replaced their leader with ${leader}`);
  });
}

export function advanceAppointmentsPhase(context) {
  const { state, deps } = context;
  if (!state.pendingAppointment) return;

  const result = deps.resolveAppointmentStep(state.pendingAppointment, state.cg.factions, state.week + 1, state.macroState);
  result.logs?.forEach((log) => pushLog(context, log));
  if (result.notification) pushNotification(context, result.notification);
  if (result.confirmationRecord) {
    state.confirmationHistory = [...state.confirmationHistory, result.confirmationRecord];
  }
  state.macroState = result.nextMacroState;
  state.pendingAppointment = result.nextAppointment;

  if (result.secStateConfirmed) {
    const settled = settleSecStatePromises(state.promises, state.cg.factions, result.secStateConfirmed.factionId, result.secStateConfirmed.name);
    state.cg = { ...state.cg, factions: settled.nextFactions };
    settled.logs.forEach((log) => pushLog(context, log));
    state.promises = settled.remainingPromises;
    if (settled.broken.length > 0) state.brokenPromises = [...state.brokenPromises, ...settled.broken];
    state.engagement = Math.min(50, state.engagement + 7);
    state.cabinet = {
      ...state.cabinet,
      secState: {
        ...state.cabinet.secState,
        occupantName: result.secStateConfirmed.name,
        factionId: result.secStateConfirmed.factionId,
        party: settled.nextFactions[result.secStateConfirmed.factionId]?.party || null,
        startWeek: state.week + 1,
        candidates: [],
        selectedCandidateId: null,
      },
    };
  } else if (result.secStateRejected) {
    state.cabinet = {
      ...state.cabinet,
      secState: {
        ...state.cabinet.secState,
        occupantName: null,
        factionId: null,
        party: null,
        startWeek: null,
        candidates: result.secStateRejected.candidates,
        selectedCandidateId: null,
      },
    };
  }
}

export function finalizeWeekPhase(context) {
  const { state, deps, runtime } = context;
  state.stats = syncDerivedStats(state.stats, state.macroState);
  const previousDeficit = context.deps.previousStats.nationalDeficit;
  if (previousDeficit && state.stats.nationalDeficit < previousDeficit - 30) {
    ["trad_con", "freedom", "mod_rep"].forEach((factionId) => adjustFaction(state.cg.factions, factionId, { relationship: 1 }));
  }
  state.stats.nationalDebt = Math.max(0, state.stats.nationalDebt + (state.stats.nationalDeficit / (52 * 1000)));
  state.stats.approvalRating = deps.advanceApproval(state.stats, deps.playerParty, runtime.nextWeek);
  state.stats = syncDerivedStats(state.stats, state.macroState);

  state.factionHist = pushFactionHistory(state.factionHist, state.cg.factions);
  const nextStateApproval = {};
  STATE_DATA.forEach((stateRow) => {
    nextStateApproval[stateRow.abbr] = deps.calcStateApproval(stateRow, state.stats, deps.playerParty, state.stBon);
  });
  const nextStateHistory = { ...state.stateHist };
  Object.entries(nextStateApproval).forEach(([abbr, value]) => {
    nextStateHistory[abbr] = [...(nextStateHistory[abbr] || []), value].slice(-52);
  });
  state.stateHist = nextStateHistory;
  state.stBon = Object.fromEntries(
    Object.entries(state.stBon)
      .map(([abbr, value]) => [abbr, value * 0.94])
      .filter(([, value]) => Math.abs(value) > 0.0001)
  );
  state.week = runtime.nextWeek;
  state.notifications = state.notifications.filter((notification) => runtime.nextWeek - notification.addedWeek < 2);
  state.recentDisasters = Object.fromEntries(
    Object.entries(state.recentDisasters).filter(([, weekOccurred]) => state.week - weekOccurred < 4)
  );
  state.act = 0;
}

export function advancePromisesPhase(context) {
  const { state } = context;
  state.promises.forEach((promise) => {
    if (promise.type === "bill" && promise.deadline - (state.week + 1) === 12 && !state.passedLegislation[promise.billId]) {
      const bill = POLICY_ACTIONS.find((action) => action.id === promise.billId);
      const faction = state.cg.factions[promise.factionId];
      pushNotification(context, {
        type: "promise_warning",
        message: `Promise deadline in 12 weeks: pass "${bill?.name}" for ${faction?.name || promise.factionId}.`,
        tab: "party",
      });
    }
  });

  const remainingPromises = [];
  const newBroken = [];
  state.promises.forEach((promise) => {
    const fulfilled = promise.type === "bill"
      ? !!state.passedLegislation[promise.billId]
      : (state.cabinet.secState.occupantName && state.cabinet.secState.factionId === promise.promisedFactionId);

    if (fulfilled) {
      pushLog(context, `Promise kept: ${getPromiseLabel(promise)}. ${state.cg.factions[promise.factionId]?.name} trust +${promise.successTrustBoost || 5}.`);
      adjustFaction(state.cg.factions, promise.factionId, { trust: promise.successTrustBoost || 5 });
      return;
    }

    if (promise.deadline <= state.week + 1) {
      pushLog(context, `Broken promise: failed to ${getPromiseLabel(promise)}. ${state.cg.factions[promise.factionId]?.name} relationship -${promise.brokenRelPenalty || 10}, trust -${promise.brokenTrustPenalty || 15}.`);
      adjustFaction(state.cg.factions, promise.factionId, {
        relationship: -(promise.brokenRelPenalty || 10),
        trust: -(promise.brokenTrustPenalty || 15),
      });
      newBroken.push({
        factionName: state.cg.factions[promise.factionId]?.name,
        promiseLabel: getPromiseLabel(promise),
        relationshipLoss: promise.brokenRelPenalty || 10,
        trustLoss: promise.brokenTrustPenalty || 15,
      });
      return;
    }

    remainingPromises.push(promise);
  });

  state.promises = remainingPromises;
  if (newBroken.length > 0) state.brokenPromises = [...state.brokenPromises, ...newBroken];
}

export function advanceSurrogatesPhase(context) {
  const { state, deps } = context;
  const completed = [];
  state.surrogates = state.surrogates.map((surrogate) => {
    if (!surrogate.busy) return surrogate;
    const weeksLeft = surrogate.busy.weeksLeft - 1;
    if (weeksLeft <= 0) {
      completed.push(surrogate);
      return { ...surrogate, busy: null };
    }
    return { ...surrogate, busy: { ...surrogate.busy, weeksLeft } };
  });

  completed.forEach((surrogate) => {
    if (surrogate.busy.type === "faction_rel") {
      adjustFaction(state.cg.factions, surrogate.busy.factionId, { relationship: surrogate.busy.relBonus });
      pushLog(context, `${surrogate.name} completed: improved relations with ${surrogate.busy.factionName} (+${surrogate.busy.relBonus} relationship).`);
      pushNotification(context, {
        type: "surrogate_done",
        message: `${surrogate.name} improved relations with ${surrogate.busy.factionName} (+${surrogate.busy.relBonus} relationship).`,
      });
      return;
    }

    if (surrogate.busy.type === "foreign_visit") {
      const relGain = Math.floor(Math.random() * 13) - 4;
      const trustGain = Math.max(0, relGain > 0 ? Math.floor(relGain * 0.6 + Math.random() * 3) : Math.floor(Math.random() * 4) - 2);
      state.countries = state.countries.map((country) => {
        if (country.id !== surrogate.busy.countryId) return country;
        return {
          ...country,
          relationship: clamp((country.relationship || 0) + relGain, 0, 100),
          trust: clamp((country.trust || 0) + trustGain, 0, 100),
          status: deps.countryStatus(clamp((country.relationship || 0) + relGain, 0, 100)),
        };
      });
      pushLog(context, `${surrogate.name} foreign visit to ${surrogate.busy.countryName}: ${relGain >= 2 ? "Successful visit" : relGain < 0 ? "Visit caused friction" : "Uneventful visit"} (rel ${relGain >= 0 ? "+" : ""}${relGain}).`);
      state.engagement = Math.min(50, state.engagement + 2);
      if (relGain >= 5) state.stats.approvalRating = (state.stats.approvalRating || 50) + 1;
      pushNotification(context, {
        type: "surrogate_done",
        message: `${surrogate.name} returned from ${surrogate.busy.countryName}: ${relGain >= 0 ? "+" : ""}${relGain} relationship, +${trustGain} trust${relGain >= 5 ? ", +1 approval" : ""}.`,
      });
      return;
    }

    if (surrogate.busy.type === "coach") {
      const success = Math.random() < 0.66;
      if (success && state.cg.factions[surrogate.busy.factionId]?.leader) {
        const leader = { ...state.cg.factions[surrogate.busy.factionId].leader };
        leader[surrogate.busy.skill] = Math.min(10, (leader[surrogate.busy.skill] || 1) + 1);
        state.cg.factions[surrogate.busy.factionId] = { ...state.cg.factions[surrogate.busy.factionId], leader };
        pushLog(context, `${surrogate.name} successfully coached ${surrogate.busy.factionName} leader — ${surrogate.busy.skill} +1.`);
      } else {
        pushLog(context, `${surrogate.name}'s coaching of ${surrogate.busy.factionName} leader did not produce results.`);
      }
      state.coachCooldown = state.week + 8;
      pushNotification(context, {
        type: success ? "surrogate_done" : "surrogate_fail",
        message: success
          ? `${surrogate.name}: ${surrogate.busy.factionName} leader's ${surrogate.busy.skill} improved (+1). Coaching available again in 8 weeks.`
          : `${surrogate.name}: ${surrogate.busy.factionName} leader was resistant to coaching. No improvement. Cooldown: 8 weeks.`,
      });
    }
  });
}

export function advanceElectionPhase(context) {
  const { state, deps, runtime } = context;
  const year = Math.ceil(runtime.nextWeek / 52);
  const weekOfYear = ((runtime.nextWeek - 1) % 52) + 1;
  const isElectionYear = year >= 2 && year % 2 === 0;
  const isPresidentialYear = year >= 4 && year % 4 === 0;
  if (weekOfYear !== 44 || !isElectionYear || state.pendingCongressUpdate) return;

  const enthusiasm = deps.computeEnthusiasms(state.cg, deps.playerParty, deps.currentApproval, state.executiveOverreach, state.passedLegislation, state.promises, state.campaignActivity);
  const seatChanges = deps.computeSeatChanges(state.cg, deps.playerParty, deps.currentApproval, enthusiasm.partyEnthusiasm, enthusiasm.oppEnthusiasm, isPresidentialYear, state.campaignActivity);
  const newFactions = deps.applyElectionSeats(state.cg.factions, seatChanges.factionHouseChanges, seatChanges.factionSenateChanges);
  const newFactionsWithRelEffects = deps.applyPostElectionRelEffects(newFactions, seatChanges.houseNetChange, deps.playerParty);
  state.pendingCongressUpdate = {
    newFactions: newFactionsWithRelEffects,
    houseNetChange: seatChanges.houseNetChange,
    senateNetChange: seatChanges.senateNetChange,
    factionBreakdown: deps.buildMidtermResults(state.cg, deps.playerParty, year, deps.currentApproval, enthusiasm.partyEnthusiasm, enthusiasm.oppEnthusiasm, seatChanges.houseNetChange, seatChanges.senateNetChange, seatChanges.factionHouseChanges, seatChanges.factionSenateChanges, isPresidentialYear).factionBreakdown,
  };
  state.midtermResults = deps.buildMidtermResults(state.cg, deps.playerParty, year, deps.currentApproval, enthusiasm.partyEnthusiasm, enthusiasm.oppEnthusiasm, seatChanges.houseNetChange, seatChanges.senateNetChange, seatChanges.factionHouseChanges, seatChanges.factionSenateChanges, isPresidentialYear);
  state.showMidtermModal = true;
  state.congressHistory = [...state.congressHistory, deps.buildHistorySnapshot(state.cg, year, seatChanges.houseNetChange, seatChanges.senateNetChange, enthusiasm.partyEnthusiasm, enthusiasm.oppEnthusiasm, deps.currentApproval, isPresidentialYear)];
  state.campaignSeasonStarted = false;
  state.pollingNoise = 0;
  pushLog(context, `ELECTION RESULTS — Year ${year}: Party ${seatChanges.houseNetChange >= 0 ? "GAINED" : "LOST"} ${Math.abs(seatChanges.houseNetChange)} House seat${Math.abs(seatChanges.houseNetChange) !== 1 ? "s" : ""} and ${seatChanges.senateNetChange >= 0 ? "gained" : "lost"} ${Math.abs(seatChanges.senateNetChange)} Senate seat${Math.abs(seatChanges.senateNetChange) !== 1 ? "s" : ""}. Approval: ${Math.round(deps.currentApproval)}%. Party enthusiasm: ${Math.round(enthusiasm.partyEnthusiasm)}, Opposition: ${Math.round(enthusiasm.oppEnthusiasm)}.`);
}

export function advanceDiplomacyPhase(context) {
  const { state, runtime } = context;
  let nextOverreach = state.executiveOverreach;
  let nextOverreachLowSinceWeek = state.overreachLowSinceWeek;
  if (nextOverreach > 31) {
    nextOverreachLowSinceWeek = 0;
    if (runtime.nextWeek - state.overreachLastIncreasedWeek >= 2) {
      nextOverreach = Math.max(31, nextOverreach - (nextOverreach > 60 ? 5 : 3));
    }
    if (nextOverreach <= 31) nextOverreachLowSinceWeek = runtime.nextWeek;
  } else {
    if (!nextOverreachLowSinceWeek) nextOverreachLowSinceWeek = state.week;
    if (runtime.nextWeek - nextOverreachLowSinceWeek >= 4 && runtime.nextWeek - state.overreachLastIncreasedWeek >= 4) {
      nextOverreach = Math.max(15, nextOverreach - 1);
    }
  }
  state.executiveOverreach = nextOverreach;
  state.overreachLowSinceWeek = nextOverreach <= 31 ? nextOverreachLowSinceWeek : 0;

  const engagementDecay = runtime.nextWeek > 8 && (state.lastForeignTripWeek === 0 || runtime.nextWeek - state.lastForeignTripWeek > 6);
  const secStateVacantPenalty = runtime.nextWeek >= 8 && !state.cabinet.secState.occupantName ? 3 : 0;
  const newEngagement = Math.max(0, state.engagement - (engagementDecay ? 0.5 : 0) - secStateVacantPenalty);
  state.engagement = newEngagement;

  if (runtime.nextWeek === 8 && !state.cabinet.secState.occupantName) {
    pushNotification(context, {
      type: "appointment_fail",
      message: "Secretary of State is still vacant. International engagement will now fall by 3 each week until the post is filled.",
      tab: "cabinet",
    });
    pushLog(context, "Secretary of State remains vacant at week 8. International engagement will now drop by 3 each week.");
  }

  const spendingChange = state.stats.militarySpending - state.lastMilitarySpending;
  const projectionDelta = spendingChange === 0 ? 0 : Math.max(-6, Math.min(6, spendingChange / 50));
  const newPowerProjection = Math.max(0, Math.min(50, state.powerProjection + projectionDelta));
  state.powerProjection = newPowerProjection;
  state.lastMilitarySpending = state.stats.militarySpending;

  const greatPowers = new Set(["india", "uk", "france", "russia", "china"]);
  const statusRank = { ALLIED: 4, FRIENDLY: 3, NEUTRAL: 2, UNFRIENDLY: 1, HOSTILE: 0 };
  let tensionDelta = (Math.random() - 0.5) * 1.5;
  state.countries.forEach((country) => {
    const previousStatus = state.countryStatusSnapshot[country.id];
    if (!previousStatus || previousStatus === country.status) return;
    const previousRank = statusRank[previousStatus] ?? -1;
    const currentRank = statusRank[country.status] ?? -1;
    if (currentRank >= previousRank) return;
    const levels = previousRank - currentRank;
    if (greatPowers.has(country.id)) {
      tensionDelta += levels * 5;
      return;
    }
    for (let index = 0; index < levels; index += 1) {
      tensionDelta += (previousRank - index) === 1 ? 3 : 2;
    }
  });
  const newGlobalTension = Math.max(0, Math.min(50, state.globalTension + tensionDelta));
  state.globalTension = newGlobalTension;
  state.countryStatusSnapshot = Object.fromEntries(state.countries.map((country) => [country.id, country.status]));

  if (newEngagement < 20 && !state.diplomacyThresholds.engagementLow) {
    pushLog(context, "International engagement has fallen to a low level.");
    pushNotification(context, { type: "surrogate_fail", message: "International engagement is now low — foreign partners are losing interest." });
    state.diplomacyThresholds = { ...state.diplomacyThresholds, engagementLow: true };
  } else if (newEngagement >= 20 && state.diplomacyThresholds.engagementLow) {
    state.diplomacyThresholds = { ...state.diplomacyThresholds, engagementLow: false };
  }

  if (newPowerProjection < 32 && !state.diplomacyThresholds.projectionWeak) {
    pushLog(context, "U.S. power projection has weakened below a major power threshold.");
    pushNotification(context, { type: "surrogate_fail", message: "Power projection has weakened — the U.S. is no longer perceived as a major power." });
    state.diplomacyThresholds = { ...state.diplomacyThresholds, projectionWeak: true };
  } else if (newPowerProjection >= 32 && state.diplomacyThresholds.projectionWeak) {
    state.diplomacyThresholds = { ...state.diplomacyThresholds, projectionWeak: false };
  }

  if (newGlobalTension > 35 && !state.diplomacyThresholds.tensionHigh) {
    pushLog(context, "Global tension has risen to a high level. Progressives are alarmed.");
    pushNotification(context, { type: "surrogate_fail", message: "Global tension is now high — this is straining the Progressive Caucus." });
    state.diplomacyThresholds = { ...state.diplomacyThresholds, tensionHigh: true };
  } else if (newGlobalTension <= 35 && state.diplomacyThresholds.tensionHigh) {
    state.diplomacyThresholds = { ...state.diplomacyThresholds, tensionHigh: false };
  }
}

export function advanceEventPhase(context) {
  const { state, deps, runtime } = context;
  if (((runtime.nextWeek - 1) % 52) + 1 === 1 && !state.macroState.fedVacant && Math.random() < 0.2) {
    state.macroState = { ...state.macroState, fedVacant: true, fedDecisionSummary: "Chair vacancy pending Senate confirmation." };
    state.curEv = deps.buildFedNominationEvent();
    pushLog(context, "Federal Reserve Chair vacancy opened. Senate confirmation is required for a new governor.");
    return;
  }

  const stateApproval = {};
  STATE_DATA.forEach((stateRow) => {
    stateApproval[stateRow.abbr] = deps.calcStateApproval(stateRow, state.stats, deps.playerParty, state.stBon);
  });
  const pools = generateDynamicEvents(
    state.stats,
    stateApproval,
    state.usedEv,
    deps.playerParty,
    runtime.nextWeek,
    state.passedLegislation,
    state.countries
  );

  const readyChain = state.pendingChainEvents.find((entry) => runtime.nextWeek >= entry.triggerAtWeek);
  if (readyChain) {
    state.pendingChainEvents = state.pendingChainEvents.filter((entry) => entry !== readyChain);
    if (readyChain.event.unique) state.usedEv.add(readyChain.event.id);
    const applied = applyEffectsBundle(state.stats, state.macroState, readyChain.event.effects || {}, readyChain.event);
    state.stats = applied.stats;
    state.macroState = applied.macroState;
    state.curEv = readyChain.event;
    return;
  }

  const immediateEvent = pools.immediatePool.length > 0 ? pools.immediatePool[Math.floor(Math.random() * pools.immediatePool.length)] : null;
  if (immediateEvent) {
    if (immediateEvent.unique) state.usedEv.add(immediateEvent.id);
    const applied = applyEffectsBundle(state.stats, state.macroState, immediateEvent.effects || {}, immediateEvent);
    state.stats = applied.stats;
    state.macroState = applied.macroState;
    state.curEv = immediateEvent;
    if (immediateEvent.category === "special") state.lastSpecialEventWeek = runtime.nextWeek;
    return;
  }

  const rolledEvents = [];
  if (runtime.nextWeek % 4 === 0) {
    const specialCooldownActive = state.lastSpecialEventWeek > 0 && (runtime.nextWeek - state.lastSpecialEventWeek) <= SPECIAL_COOLDOWN_WEEKS;
    const eligibleRandomEvents = specialCooldownActive
      ? pools.randomPool.filter((event) => event.category !== "special")
      : pools.randomPool;
    rolledEvents.push(...rollEligibleSpecialEvents(eligibleRandomEvents, RANDOM_EVENT_CHECKS_PER_YEAR, Math.random));
  }
  if (isDisasterCheckWeek(runtime.nextWeek)) {
    rolledEvents.push(...rollEligibleSpecialEvents(pools.disasterPool, DISASTER_EVENT_CHECKS_PER_YEAR, Math.random));
  }
  const chosenEvent = chooseHighestPriorityEvent(rolledEvents, Math.random);
  if (!chosenEvent) return;
  if (chosenEvent.unique) state.usedEv.add(chosenEvent.id);
  const applied = applyEffectsBundle(state.stats, state.macroState, chosenEvent.effects || {}, chosenEvent);
  state.stats = applied.stats;
  state.macroState = applied.macroState;
  state.curEv = chosenEvent;
  if (chosenEvent.category === "special") state.lastSpecialEventWeek = runtime.nextWeek;
}

export function runWeeklySimulation(snapshot, deps) {
  const context = createContext(snapshot, deps);
  advanceEconomyPhase(context);
  advanceCongressPhase(context);
  advanceAppointmentsPhase(context);
  finalizeWeekPhase(context);
  advancePromisesPhase(context);
  advanceSurrogatesPhase(context);
  advanceElectionPhase(context);
  advanceDiplomacyPhase(context);
  advanceEventPhase(context);

  const mergedLog = [...context.sideEffects.logs.reverse(), ...snapshot.log].slice(0, 100);
  const mergedNotifications = [...snapshot.notifications, ...context.sideEffects.notifications].filter(
    (notification) => context.state.week - notification.addedWeek < 2
  );

  return {
    ...context.state,
    log: mergedLog,
    notifications: mergedNotifications,
  };
}
