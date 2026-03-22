import { EXECUTIVE_ORDERS } from "../data/executiveOrders.js";
import { STATE_DATA } from "../data/states.js";
import { applyEffectsBundle, applyStateActionEffects, syncDerivedStats } from "./effectResolution.js";

const STRIKE_PROBABILITY_BY_RISK = [0, 0.10, 0.25, 0.40, 0.75];
const CERT_PROBABILITY_BY_CONTROVERSY = { 0: 0, 1: 0.33, 2: 0.66, 3: 1 };
const SELECTION_WEIGHT_BY_RISK = [1, 2, 4, 7, 12];
const IDEOLOGY_THRESHOLDS = {
  very_liberal: 0.42,
  liberal: 0.50,
  conservative: 0.58,
  very_conservative: 0.66,
};

function randInt(min, max, rng = Math.random) {
  return min + Math.floor(rng() * (max - min + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function negateNumericMap(values = {}) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, -value]));
}

function findExecutiveOrder(orderId) {
  return EXECUTIVE_ORDERS.find((order) => order.id === orderId) || null;
}

export function getLegalStrikeProbability(legalRisk = 0) {
  return STRIKE_PROBABILITY_BY_RISK[legalRisk] ?? 0;
}

export function getCertGrantProbability(controversy = 0) {
  return CERT_PROBABILITY_BY_CONTROVERSY[controversy] ?? 0;
}

export function getEligibleJudicialReviewOrders(activeOrders = [], nextWeek) {
  return activeOrders.filter((order) => (
    order.active
    && !order.invalidatedWeek
    && order.courtStatus === "active"
    && nextWeek <= (order.issuedWeek + 52)
  ));
}

export function pickWeightedJudicialReviewOrder(activeOrders = [], nextWeek, rng = Math.random) {
  const eligibleOrders = getEligibleJudicialReviewOrders(activeOrders, nextWeek);
  if (!eligibleOrders.length) return null;

  const weightedOrders = eligibleOrders.map((activeOrder) => {
    const eo = findExecutiveOrder(activeOrder.id);
    const weight = SELECTION_WEIGHT_BY_RISK[eo?.legal_risk ?? 0] ?? 1;
    return { activeOrder, weight };
  });
  const totalWeight = weightedOrders.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * totalWeight;
  for (const entry of weightedOrders) {
    roll -= entry.weight;
    if (roll <= 0) return entry.activeOrder;
  }
  return weightedOrders[weightedOrders.length - 1].activeOrder;
}

function buildQueuedJudicialEvent(state, event) {
  if (state.curEv) {
    state.pendingJudicialEvent = event;
  } else {
    state.curEv = event;
  }
}

function buildOrderLabel(activeOrder) {
  return activeOrder?.name || "Executive Order";
}

export function invalidateExecutiveOrder({
  activeOrders,
  orderId,
  invalidatedWeek,
  stats,
  macroState,
  stBon,
  pFx,
  drillingRegionStateMap = {},
  maxActions = null,
}) {
  const activeOrder = activeOrders.find((order) => order.id === orderId && order.active);
  if (!activeOrder) {
    return {
      activeOrders: [...activeOrders],
      stats: { ...stats },
      macroState: { ...macroState, impulses: { ...(macroState.impulses || {}) } },
      stBon: { ...stBon },
      pFx: [...pFx],
      maxActions,
    };
  }

  const snapshot = activeOrder.outcomeSnapshot || {};
  const reversed = applyEffectsBundle(
    stats,
    macroState,
    negateNumericMap(snapshot.effects || {}),
    { macroEffects: negateNumericMap(snapshot.macroEffects || {}) }
  );

  const reversedStateEffects = snapshot.stateEffects
    ? applyStateActionEffects(
        stBon,
        { stateEffects: { ...snapshot.stateEffects, weight: -(snapshot.stateEffects.weight || 0) } },
        STATE_DATA,
        drillingRegionStateMap
      )
    : { ...stBon };

  const nextActiveOrders = activeOrders.map((order) => (
    order === activeOrder
      ? { ...order, active: false, courtStatus: "invalidated", invalidatedWeek }
      : order
  ));

  const nextPFx = pFx.filter((effect) => !(effect.sourceType === "executive_order" && effect.sourceId === orderId));
  const nextMaxActions = snapshot.specialEffects?.some((effect) => effect.id === "weekly_actions")
    ? 4
    : maxActions;

  return {
    activeOrders: nextActiveOrders,
    stats: syncDerivedStats(reversed.stats, reversed.macroState),
    macroState: reversed.macroState,
    stBon: reversedStateEffects,
    pFx: nextPFx,
    maxActions: nextMaxActions,
  };
}

function buildAppellateEvent(activeOrder, appellateStruck) {
  const orderName = buildOrderLabel(activeOrder);
  if (appellateStruck) {
    return {
      id: `eo_appeals_struck_${activeOrder.id}_${Date.now()}`,
      type: "eo_appeals_struck",
      name: `${orderName} Struck Down by the Court of Appeals`,
      desc: `After a lengthy legal battle, the U.S. Court of Appeals has ruled that the ${orderName.toLowerCase()} is unlawful and struck it down. The administration must decide whether to seek Supreme Court review or let the ruling stand.`,
      orderId: activeOrder.id,
      choices: [
        { text: "Appeal to the Supreme Court (1 action)", judicialAction: "appeal_to_scotus", orderId: activeOrder.id },
        { text: "Accept the ruling", judicialAction: "invalidate_order", orderId: activeOrder.id, reason: "appeals_struck" },
      ],
    };
  }

  return {
    id: `eo_appeals_upheld_${activeOrder.id}_${Date.now()}`,
    type: "eo_appeals_upheld",
    name: `${orderName} Upheld by the Court of Appeals`,
    desc: `After months of litigation, the U.S. Court of Appeals has upheld the ${orderName.toLowerCase()}. The order remains in force, and the administration claims a legal victory.`,
    orderId: activeOrder.id,
    choices: [
      { text: "Note the ruling", judicialAction: "close_judicial_event", orderId: activeOrder.id },
    ],
  };
}

function getFactionOppositionForIdeology(factionReactions = {}, ideology) {
  if (ideology === "very_liberal") {
    const reaction = factionReactions.prog ?? 0;
    return clamp((-reaction + 1) / 2, 0, 1);
  }
  if (ideology === "liberal") {
    const modDem = clamp((-(factionReactions.mod_dem ?? 0) + 1) / 2, 0, 1);
    const blueDog = clamp((-(factionReactions.blue_dog ?? 0) + 1) / 2, 0, 1);
    return (modDem * 0.7) + (blueDog * 0.3);
  }
  if (ideology === "conservative") {
    const modRep = clamp((-(factionReactions.mod_rep ?? 0) + 1) / 2, 0, 1);
    const tradCon = clamp((-(factionReactions.trad_con ?? 0) + 1) / 2, 0, 1);
    return (modRep * 0.6) + (tradCon * 0.4);
  }
  const freedom = clamp((-(factionReactions.freedom ?? 0) + 1) / 2, 0, 1);
  const tradCon = clamp((-(factionReactions.trad_con ?? 0) + 1) / 2, 0, 1);
  return (freedom * 0.65) + (tradCon * 0.35);
}

export function computeScotusDecision(activeOrder, justices = [], rng = Math.random) {
  const eo = findExecutiveOrder(activeOrder?.id);
  if (!eo) return null;

  const voteLines = justices.map((justice) => {
    const factionOpposition = getFactionOppositionForIdeology(activeOrder?.outcomeSnapshot?.factionReactions || {}, justice.ideology);
    const strikeScore = (
      getLegalStrikeProbability(eo.legal_risk) * 0.50
      + (eo.controversy / 3) * 0.17
      + factionOpposition * 0.33
      + ((rng() * 0.08) - 0.04)
    );
    const votesToStrike = strikeScore >= (IDEOLOGY_THRESHOLDS[justice.ideology] ?? 0.55);
    return { justice, votesToStrike };
  });

  const strikeVotes = voteLines.filter((line) => line.votesToStrike);
  const upholdVotes = voteLines.filter((line) => !line.votesToStrike);

  const strikesDown = strikeVotes.length >= 5;
  const actualMajority = strikesDown ? strikeVotes : upholdVotes;
  const actualMinority = strikesDown ? upholdVotes : strikeVotes;
  const opinionAuthor = actualMajority[Math.floor(rng() * actualMajority.length)]?.justice || actualMajority[0]?.justice || null;
  const dissentAuthor = actualMinority.length
    ? (actualMinority[Math.floor(rng() * actualMinority.length)]?.justice || actualMinority[0]?.justice || null)
    : null;

  return {
    strikesDown,
    yesVotes: strikesDown ? strikeVotes.length : upholdVotes.length,
    noVotes: strikesDown ? upholdVotes.length : strikeVotes.length,
    voteLines,
    majorityJustices: actualMajority.map((line) => line.justice.name),
    dissentJustices: actualMinority.map((line) => line.justice.name),
    opinionAuthor,
    dissentAuthor,
  };
}

function buildScotusFinalEvent(activeOrder, scotusDecision, nextWeek) {
  const orderName = buildOrderLabel(activeOrder);
  const vote = `${scotusDecision.yesVotes}-${scotusDecision.noVotes}`;
  const unanimous = scotusDecision.noVotes === 0;
  const opinionText = scotusDecision.opinionAuthor ? ` Justice ${scotusDecision.opinionAuthor.name} authored the opinion of the Court.` : "";
  const dissentText = unanimous
    ? " The ruling was unanimous."
    : (scotusDecision.dissentAuthor ? ` Justice ${scotusDecision.dissentAuthor.name} wrote the principal dissent.` : "");

  return {
    id: `eo_scotus_final_${activeOrder.id}_${nextWeek}`,
    type: "eo_scotus_final",
    name: scotusDecision.strikesDown
      ? `Supreme Court Strikes Down ${orderName}`
      : `Supreme Court Upholds ${orderName}`,
    desc: scotusDecision.strikesDown
      ? `The Supreme Court has struck down the ${orderName.toLowerCase()} by a vote of ${vote}.${opinionText}${dissentText}`
      : `The Supreme Court has upheld the ${orderName.toLowerCase()} by a vote of ${vote}.${opinionText}${dissentText}`,
    orderId: activeOrder.id,
    decision: scotusDecision.strikesDown ? "struck_down" : "upheld",
    vote,
    choices: [
      scotusDecision.strikesDown
        ? { text: "Accept the judgment", judicialAction: "invalidate_order", orderId: activeOrder.id, reason: "scotus_struck" }
        : { text: "Read the opinion", judicialAction: "close_judicial_event", orderId: activeOrder.id },
    ],
  };
}

export function resolveReadyJudicialChainEvent(state, nextWeek, scotusJustices = [], rng = Math.random) {
  const readyEntry = state.pendingChainEvents.find((entry) => (
    nextWeek >= entry.triggerAtWeek
    && typeof entry.event?.type === "string"
    && entry.event.type.startsWith("eo_")
  ));
  if (!readyEntry) return false;

  state.pendingChainEvents = state.pendingChainEvents.filter((entry) => entry !== readyEntry);
  const activeOrder = state.activeOrders.find((order) => order.id === readyEntry.event.orderId && order.active);
  if (!activeOrder) return true;

  if (readyEntry.event.type === "eo_scotus_cert_check") {
    const eo = findExecutiveOrder(activeOrder.id);
    const granted = rng() < getCertGrantProbability(eo?.controversy ?? 0);
    buildQueuedJudicialEvent(state, {
      id: `eo_scotus_cert_${activeOrder.id}_${nextWeek}`,
      type: granted ? "eo_scotus_cert_granted" : "eo_scotus_cert_denied",
      name: granted
        ? `Supreme Court Takes Up ${activeOrder.name}`
        : `Supreme Court Declines ${activeOrder.name}`,
      desc: granted
        ? `The Supreme Court has agreed to hear the challenge to the ${activeOrder.name.toLowerCase()}. Oral arguments and a final ruling will follow after further briefing.`
        : `The Supreme Court has declined to hear the challenge to the ${activeOrder.name.toLowerCase()}, leaving the Court of Appeals ruling in place.`,
      orderId: activeOrder.id,
      choices: [
        granted
          ? { text: "Prepare for oral arguments", judicialAction: "schedule_scotus_decision", orderId: activeOrder.id }
          : { text: "Accept the denial", judicialAction: "invalidate_order", orderId: activeOrder.id, reason: "scotus_denied" },
      ],
    });
    return true;
  }

  if (readyEntry.event.type === "eo_scotus_final_pending") {
    const decision = computeScotusDecision(activeOrder, scotusJustices, rng);
    if (!decision) return true;
    const finalEvent = buildScotusFinalEvent(activeOrder, decision, nextWeek);
    state.scotusRulings = [
      {
        id: `${activeOrder.id}_${nextWeek}`,
        orderId: activeOrder.id,
        orderName: activeOrder.name,
        decision: finalEvent.decision,
        vote: finalEvent.vote,
        majorityAuthor: decision.opinionAuthor?.name || null,
        dissentAuthor: decision.dissentAuthor?.name || null,
        majorityJustices: decision.majorityJustices,
        dissentJustices: decision.dissentJustices,
        week: nextWeek,
        year: Math.ceil(nextWeek / 52),
      },
      ...(state.scotusRulings || []),
    ].slice(0, 20);
    buildQueuedJudicialEvent(state, finalEvent);
    return true;
  }

  return false;
}

export function advanceExecutiveOrderJudiciaryPhase(context) {
  const { state, runtime } = context;
  const nextWeek = runtime.nextWeek;
  const rng = Math.random;

  if (resolveReadyJudicialChainEvent(state, nextWeek, state.scotusJustices || [], rng)) {
    return;
  }

  if (state.nextExecutiveOrderCourtCheckWeek == null) {
    state.nextExecutiveOrderCourtCheckWeek = nextWeek + randInt(6, 12, rng);
    return;
  }

  if (nextWeek < state.nextExecutiveOrderCourtCheckWeek) return;

  state.nextExecutiveOrderCourtCheckWeek = nextWeek + randInt(6, 12, rng);
  const activeOrder = pickWeightedJudicialReviewOrder(state.activeOrders, nextWeek, rng);
  if (!activeOrder) return;

  const eo = findExecutiveOrder(activeOrder.id);
  const appellateStruck = rng() < getLegalStrikeProbability(eo?.legal_risk ?? 0);
  state.activeOrders = state.activeOrders.map((order) => (
    order === activeOrder
      ? { ...order, courtStatus: appellateStruck ? "appeals_struck" : "appeals_upheld" }
      : order
  ));
  state.stats.approvalRating += appellateStruck ? -1 : 1;
  buildQueuedJudicialEvent(state, buildAppellateEvent(activeOrder, appellateStruck));
}
