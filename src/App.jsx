import { useState, useCallback, useEffect, useMemo, useRef } from "react";

import { PARTIES, FACTION_DATA } from "./data/factions.js";
import { STATE_DATA } from "./data/states.js";
import { COUNTRIES_INIT } from "./data/countries.js";
import { INITIAL_STATS } from "./data/stats.js";
import { VISIT_TYPES } from "./data/visits.js";
import { SPEECH_TOPICS } from "./data/speeches.js";
import { POLICY_ACTIONS, BILL_STAGES, BILL_LOCKS, BILL_AMENDMENTS } from "./data/policies.js";
import {
  generateDynamicEvents,
  getSeasonLabel,
  rollEligibleSpecialEvents,
} from "./data/events.js";
import {
  EXECUTIVE_ORDERS,
  buildExecutiveOrderOutcome,
  isExecutiveOrderVisible,
} from "./data/executiveOrders.js";
import { TABS, ALLIED_FACTIONS, OPPOSITION_FACTIONS, COUNTRY_FACTION_EFFECTS } from "./data/constants.js";

import { generateCongress } from "./logic/generateCongress.js";
import { calcStateApproval } from "./logic/calcStateApproval.js";
import { advanceApproval } from "./logic/approvalCalc.js";
import { calcStageAdvance } from "./logic/billProgression.js";
import {
  adaptLegacyEffectsToMacroImpulses,
  applyMacroEffects,
  advanceMacroEconomy,
  buildFedNominationEvent,
  createInitialMacroState,
  deriveVisibleStats,
  pickFedChairName,
  resolveFedNomination,
} from "./logic/macroEconomy.js";
import { generateSecStateCandidates } from "./logic/cabinetAppointments.js";
import { APPOINTMENT_STAGES, evaluateAppointment } from "./logic/appointmentProgression.js";
import { computeBudgetReactions } from "./systems/budgetCalc.js";
import { makeSurrogates } from "./utils/makeSurrogates.js";
import { createNameRegistry } from "./utils/nameBank.js";

import Badge from "./components/Badge.jsx";

import LandingScreen from "./components/screens/LandingScreen.jsx";
import SetupScreen from "./components/screens/SetupScreen.jsx";
import CrisisModal from "./components/modals/CrisisModal.jsx";

import OverviewTab from "./components/tabs/OverviewTab.jsx";
import CongressTab from "./components/tabs/CongressTab.jsx";
import PartyTab from "./components/tabs/PartyTab.jsx";
import CabinetTab from "./components/tabs/CabinetTab.jsx";
import PolicyTab from "./components/tabs/PolicyTab.jsx";
import ActionsTab from "./components/tabs/ActionsTab.jsx";
import DiplomacyTab from "./components/tabs/DiplomacyTab.jsx";
import LogTab from "./components/tabs/LogTab.jsx";

import BudgetModal from "./components/modals/BudgetModal.jsx";
import EoResultModal from "./components/modals/EoResultModal.jsx";
import SignBillModal from "./components/modals/SignBillModal.jsx";
import NotificationBar from "./components/NotificationBar.jsx";
import BrokenPromiseModal from "./components/modals/BrokenPromiseModal.jsx";
import ForeignVisitModal from "./components/modals/ForeignVisitModal.jsx";
import PromiseModal from "./components/modals/PromiseModal.jsx";
import MidtermModal from "./components/modals/MidtermModal.jsx";
import InaugurationModal from "./components/modals/InaugurationModal.jsx";

import {
  computeEnthusiasms,
  computeSeatChanges,
  applyElectionSeats,
  applyPostElectionRelEffects,
  buildMidtermResults,
  buildHistorySnapshot,
  computePollingProjection,
} from "./logic/electionCalc.js";

const NORMAL_EVENT_CHANCE = 0.65;
const SPECIAL_EVENT_GATE_CHANCE = 0.35;
const SPECIAL_EFFECTIVE_CHECKS_PER_YEAR = 13 * SPECIAL_EVENT_GATE_CHANCE;
const SPECIAL_COOLDOWN_WEEKS = 4;
const DRILLING_REGION_STATE_MAP = {
  gulf: ["TX", "LA"],
  bering: ["AK"],
  atlantic: ["WV", "KY"],
  pacific: ["NM", "WY"],
};

const clampStat = (value, min = 5, max = 95) => Math.max(min, Math.min(max, value));

function createInitialCabinetState() {
  return {
    secState: {
      occupantName: null,
      factionId: null,
      party: null,
      startWeek: null,
      candidates: [],
      selectedCandidateId: null,
    },
  };
}

function getPromiseLabel(promise) {
  if (!promise) return "";
  if (promise.type === "cabinet") return `appoint Secretary of State from ${promise.promisedFactionName}`;
  return `pass "${promise.billName}"`;
}

function buildYearlyPromiseOffers({ playerParty, usedPol, billCooldowns, week, cabinetState, pendingAppointment }) {
  const offers = {};
  const secStateAvailable = !cabinetState.secState.occupantName && pendingAppointment?.officeId !== "sec_state";

  FACTION_DATA[playerParty].forEach(faction => {
    const billOptions = POLICY_ACTIONS
      .filter(action => (action.factionReactions?.[faction.id] || 0) > 0 && !usedPol.has(action.id) && !(billCooldowns[action.id] && week < billCooldowns[action.id]))
      .sort((a, b) => (b.factionReactions?.[faction.id] || 0) - (a.factionReactions?.[faction.id] || 0))
      .slice(0, 4)
      .map(action => {
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
    if (candidatePool.length > 0) {
      offers[faction.id] = candidatePool
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(2, candidatePool.length));
    } else {
      offers[faction.id] = [];
    }
  });

  return offers;
}

export default function Game() {
  const nameRegistryRef = useRef(createNameRegistry());
  const [screen, setScreen] = useState(0);
  const [pp, setPP] = useState(null);
  const [pf, setPF] = useState(null);
  const [pn, setPN] = useState("Jordan Mitchell");
  const [vpn, setVpn] = useState("Holly Barrett");
  const [cg, setCG] = useState(null);
  const [stats, setStats] = useState({ ...INITIAL_STATS });
  const [macroState, setMacroState] = useState(() => createInitialMacroState());
  const [prev, setPrev] = useState({ ...INITIAL_STATS });
  const [hist, setHist] = useState(() => {
    const h = {};
    Object.keys(INITIAL_STATS).forEach(k => h[k] = [INITIAL_STATS[k]]);
    return h;
  });
  const [week, setWeek] = useState(1);
  const [curEv, setCurEv] = useState(null);
  const [log, setLog] = useState([]);
  const [act, setAct] = useState(0);
  const [maxActions, setMaxActions] = useState(4);
  const [usedPol, setUsedPol] = useState(new Set());
  const [usedEv, setUsedEv] = useState(new Set());
  const [activeBill, setActiveBill] = useState(null); // { act, stage, fails, turnsInStage, consecutiveFails }
  const [pFx, setPFx] = useState([]);
  const [stBon, setStBon] = useState({});
  const [countries, setCountries] = useState(COUNTRIES_INIT.map(c => ({ ...c })));
  const [stateHist, setStateHist] = useState({});
  const [tab, setTab] = useState("overview");
  const [hov, setHov] = useState(null);
  const [hovFaction, setHovFaction] = useState(null);
  const [visitState, setVisitState] = useState("");
  const [visitType, setVisitType] = useState("");
  const [visitTypeCounts, setVisitTypeCounts] = useState({}); // { [visitId]: useCount } — resets each 4-week advance
  const [speechTopic, setSpeechTopic] = useState(null);
  const [speechPreview, setSpeechPreview] = useState(null);
  const [billRecord, setBillRecord] = useState([]);
  const [billLikelihood, setBillLikelihood] = useState(null);
  const [congressTab, setCongressTab] = useState("overview");
  const [policyFilter, setPolicyFilter] = useState("all");
  const [promises, setPromises] = useState([]); // [{billId, factionId, madeWeek, deadline}]
  const [promiseOffers, setPromiseOffers] = useState({});
  const [surrogates, setSurrogates] = useState([]);
  const [billCooldowns, setBillCooldowns] = useState({}); // {billId: canRetryAfterWeek}
  const [foreignVisitResult, setForeignVisitResult] = useState(null);
  const [surrogateUI, setSurrogateUI] = useState({}); // per-surrogate pending assignment UI state
  const [factionHist, setFactionHist] = useState({}); // {factionId: {trust:[], rel:[], unity:[]}}
  const [visitedCountries, setVisitedCountries] = useState({}); // {countryId: canVisitAfterWeek}
  const [lockedBills, setLockedBills] = useState(new Set());
  const [reconciliationCooldown, setReconciliationCooldown] = useState(0); // week when available
  const [showBudget, setShowBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(null);
  const [pendingPromise, setPendingPromise] = useState(null); // {factionId, billId, relBoost} — awaiting confirm
  const [brokenPromises, setBrokenPromises] = useState([]); // [{factionName, billName}] notification queue
  const [notifications, setNotifications] = useState([]); // non-intrusive notification banners
  const [coachCooldown, setCoachCooldown] = useState(0); // week when coaching is available again
  const [recentDisasters, setRecentDisasters] = useState({}); // {[stateAbbr]: weekOccurred}
  const [activeOrders, setActiveOrders] = useState([]); // [{id, issuedWeek, active, choiceData}]
  const [discoveredHiddenOrders, setDiscoveredHiddenOrders] = useState([]);
  const [eoIssuedCount, setEoIssuedCount] = useState({}); // {[eoId]: count}
  const [passedLegislation, setPassedLegislation] = useState({}); // {[billOrEoId]: weekPassed}
  const [executiveOverreach, setExecutiveOverreach] = useState(20); // 0-100
  const [engagement, setEngagement] = useState(25); // 0-50
  const [powerProjection, setPowerProjection] = useState(40); // 0-50
  const [globalTension, setGlobalTension] = useState(25); // 0-50
  const [lastForeignTripWeek, setLastForeignTripWeek] = useState(0);
  const [lastMilitarySpending, setLastMilitarySpending] = useState(886);
  const [countryStatusSnapshot, setCountryStatusSnapshot] = useState(
    () => Object.fromEntries(COUNTRIES_INIT.map(c => [c.id, c.status]))
  );
  const [diplomacyThresholds, setDiplomacyThresholds] = useState({ tensionHigh: false, engagementLow: false, projectionWeak: false });
  const [overreachLastIncreasedWeek, setOverreachLastIncreasedWeek] = useState(0);
  const [overreachLowSinceWeek, setOverreachLowSinceWeek] = useState(1);
  const [pendingChainEvents, setPendingChainEvents] = useState([]); // [{triggerAtWeek, event}]
  const [lastSpecialEventWeek, setLastSpecialEventWeek] = useState(0);
  const [actionsSubTab, setActionsSubTab] = useState("orders"); // "orders"|"visits"|"speeches"
  const [selectedEO, setSelectedEO] = useState(null); // eo id for preview
  const [eoChoice, setEoChoice] = useState({}); // {countryId, declassifyId} for choice EOs
  const [eoResult, setEoResult] = useState(null); // popup after issuing
  const [pendingNegotiation, setPendingNegotiation] = useState(null); // { amendments, eligibleFactionIds, stage } or null
  const [appliedAmendments, setAppliedAmendments] = useState({}); // { [billId]: [amendmentId, ...] }
  const [billFactionVotes, setBillFactionVotes] = useState(null); // factionVotes array from last calcStageAdvance
  const [pendingSignature, setPendingSignature] = useState(null); // { act, votes, factionVotes, isBudget, budgetDraft } — awaiting sign/veto
  const [pendingAppointment, setPendingAppointment] = useState(null); // {officeId, officeLabel, nomineeName, personality, stage, stages, startedWeek, factionReactions}
  const [confirmationHistory, setConfirmationHistory] = useState([]);
  const [cabinet, setCabinet] = useState(() => createInitialCabinetState());

  // ── Election state ──────────────────────────────────────────────────────────
  const [congressHistory, setCongressHistory] = useState([]);
  const [midtermResults, setMidtermResults] = useState(null);
  const [showMidtermModal, setShowMidtermModal] = useState(false);
  const [pendingCongressUpdate, setPendingCongressUpdate] = useState(null); // {newFactions, houseNetChange, senateNetChange, factionBreakdown} — applied at Year N+1 Week 1
  const [showInaugurationModal, setShowInaugurationModal] = useState(false);
  const [campaignSeasonStarted, setCampaignSeasonStarted] = useState(false);
  const [campaignActivity, setCampaignActivity] = useState(0); // speeches + visits + surrogate actions during campaign
  const [pollingNoise, setPollingNoise] = useState(0);
  const [isPresidentialElection, setIsPresidentialElection] = useState(false);

  const yr = Math.ceil(week / 52), wiy = ((week - 1) % 52) + 1;
  const season = getSeasonLabel(week);

  const addNotification = useCallback((n) => {
    setNotifications(prev => [...prev, { id: Date.now() + Math.random(), addedWeek: week, ...n }]);
  }, [week]);
  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const sA = useMemo(() => {
    const r = {};
    STATE_DATA.forEach(s => { r[s.abbr] = calcStateApproval(s, stats, pp, stBon); });
    return r;
  }, [stats, pp, stBon]);

  const natA = stats.approvalRating;

  const campaignMetrics = useMemo(() => {
    if (!cg || !pp) return null;
    const isElectionYear = yr >= 2 && yr % 2 === 0;
    if (!isElectionYear || wiy < 28) return null;
    const { partyEnthusiasm, oppEnthusiasm } = computeEnthusiasms(cg, pp, natA, executiveOverreach, passedLegislation, promises, campaignActivity);
    const { projectedHouseChange, projectedSenateChange, advice } = computePollingProjection(partyEnthusiasm, oppEnthusiasm, natA, pollingNoise, isPresidentialElection, campaignActivity);
    const weeksUntilElection = Math.max(0, 44 - wiy);
    return { partyEnthusiasm, oppEnthusiasm, projectedHouseChange, projectedSenateChange, advice, weeksUntilElection };
  }, [cg, pp, natA, executiveOverreach, passedLegislation, promises, campaignActivity, pollingNoise, isPresidentialElection, wiy, yr]);

  const addLog = useCallback(msg => setLog(p => [{ week, text: msg }, ...p].slice(0, 100)), [week]);

  useEffect(() => {
    const newlyVisible = EXECUTIVE_ORDERS.filter(order => (
      order.class === "hidden"
      && isExecutiveOrderVisible(order, week)
      && !discoveredHiddenOrders.includes(order.id)
    ));

    if (!newlyVisible.length) return;

    setDiscoveredHiddenOrders(prev => [...prev, ...newlyVisible.map(order => order.id)]);
    newlyVisible.forEach((order) => {
      addNotification({
        type: "eo_unlock",
        message: `New executive order available: ${order.name}.`,
        tab: "actions",
      });
    });
  }, [addNotification, discoveredHiddenOrders, week]);

  const syncDerivedStats = useCallback((baseStats, nextMacroState) => (
    deriveVisibleStats(baseStats, nextMacroState)
  ), []);

  const applyEffectsBundle = useCallback((currentStats, currentMacroState, effects = {}, sourceMeta = {}, mult = 1) => {
    let nextStats = { ...currentStats };
    let nextMacroState = applyMacroEffects(currentMacroState, sourceMeta.macroEffects || {}, mult);
    nextMacroState = adaptLegacyEffectsToMacroImpulses(nextMacroState, effects, sourceMeta, mult);

    Object.entries(effects || {}).forEach(([key, rawValue]) => {
      const value = rawValue * mult;
      if (["gdpGrowth", "unemployment", "inflation"].includes(key)) return;
      if (nextStats[key] !== undefined) nextStats[key] += value;
    });

    nextStats = syncDerivedStats(nextStats, nextMacroState);
    return { stats: nextStats, macroState: nextMacroState };
  }, [syncDerivedStats]);

  const buildAppointmentProcess = useCallback((config) => {
    const {
      officeId,
      officeLabel,
      nomineeName,
      personality = null,
      factionReactions = null,
      nomineeFactionId = null,
      nomineeFactionName = null,
      isHighPriority = false,
    } = config;

    return {
      officeId,
      officeLabel,
      nomineeName,
      personality,
      nomineeFactionId,
      nomineeFactionName,
      stage: "committee_hearing",
      stages: APPOINTMENT_STAGES,
      startedWeek: week,
      turnsInStage: 0,
      factionReactions: factionReactions || resolveFedNomination(cg, pp, personality).reactions,
      factionVotes: [],
      passLikelihood: 100,
      isHighPriority,
    };
  }, [cg, pp, week]);

  const refreshPromiseOffers = useCallback((overrides = {}) => {
    const factions = overrides.factions || cg?.factions;
    const playerParty = overrides.playerParty || pp;
    if (!factions || !playerParty) return;
    setPromiseOffers(buildYearlyPromiseOffers({
      factions,
      playerParty,
      usedPol: overrides.usedPol || usedPol,
      billCooldowns: overrides.billCooldowns || billCooldowns,
      week: overrides.week || week,
      cabinetState: overrides.cabinetState || cabinet,
      pendingAppointment: Object.prototype.hasOwnProperty.call(overrides, "pendingAppointment") ? overrides.pendingAppointment : pendingAppointment,
    }));
  }, [billCooldowns, cabinet, cg, pendingAppointment, pp, usedPol, week]);

  const settleSecStatePromises = useCallback((factionsSnapshot, confirmedFactionId, occupantName) => {
    const nextFactions = { ...factionsSnapshot };
    const remainingPromises = [];
    const broken = [];
    const logs = [];

    promises.forEach(promise => {
      if (promise.type !== "cabinet" || promise.officeId !== "sec_state") {
        remainingPromises.push(promise);
        return;
      }

      if (promise.promisedFactionId === confirmedFactionId) {
        if (nextFactions[promise.factionId]) {
          nextFactions[promise.factionId] = {
            ...nextFactions[promise.factionId],
            trust: clampStat(nextFactions[promise.factionId].trust + (promise.successTrustBoost || 8)),
          };
        }
        logs.push(`Promise kept: ${occupantName} gave ${promise.promisedFactionName} Secretary of State. Trust +${promise.successTrustBoost || 8}.`);
        return;
      }

      if (nextFactions[promise.factionId]) {
        nextFactions[promise.factionId] = {
          ...nextFactions[promise.factionId],
          relationship: clampStat(nextFactions[promise.factionId].relationship - (promise.betrayalRelPenalty || 18)),
          trust: clampStat(nextFactions[promise.factionId].trust - (promise.betrayalTrustPenalty || 35)),
        };
      }
      logs.push(`Broken promise: ${promise.promisedFactionName} was promised Secretary of State, but ${occupantName} came from another faction.`);
      broken.push({
        factionName: nextFactions[promise.factionId]?.name || promise.promisedFactionName,
        promiseLabel: getPromiseLabel(promise),
        relationshipLoss: promise.betrayalRelPenalty || 18,
        trustLoss: promise.betrayalTrustPenalty || 35,
      });
    });

    return { nextFactions, remainingPromises, broken, logs };
  }, [promises]);

  const beginSecStateAppointment = useCallback(() => {
    if (act >= maxActions || pendingAppointment) return;
    const candidates = generateSecStateCandidates(pp, nameRegistryRef.current);
    setCabinet(prev => ({
      ...prev,
      secState: {
        ...prev.secState,
        candidates,
        selectedCandidateId: null,
      },
    }));
    setAct(prev => prev + 1);
  }, [act, maxActions, pendingAppointment, pp]);

  const selectSecStateCandidate = useCallback((candidateId) => {
    setCabinet(prev => ({
      ...prev,
      secState: {
        ...prev.secState,
        selectedCandidateId: prev.secState.selectedCandidateId === candidateId ? null : candidateId,
      },
    }));
  }, []);

  const nominateSecStateCandidate = useCallback(() => {
    const candidateId = cabinet.secState.selectedCandidateId;
    const candidate = cabinet.secState.candidates.find(entry => entry.id === candidateId);
    if (!candidate) return;
    setPendingAppointment(buildAppointmentProcess({
      officeId: "sec_state",
      officeLabel: "Secretary of State",
      nomineeName: candidate.name,
      nomineeFactionId: candidate.factionId,
      nomineeFactionName: candidate.factionName,
      factionReactions: candidate.reactions,
      isHighPriority: true,
      lobbyUsedStage: null,
    }));
    setCabinet(prev => ({
      ...prev,
      secState: {
        ...prev.secState,
        selectedCandidateId: null,
      },
    }));
    refreshPromiseOffers({ pendingAppointment: { officeId: "sec_state" } });
    addLog(`${candidate.name} was nominated for Secretary of State.`);
  }, [addLog, buildAppointmentProcess, cabinet.secState.candidates, cabinet.secState.selectedCandidateId, refreshPromiseOffers]);

  const resolveAppointmentStep = useCallback((appointment, factionsSnapshot, effectiveWeek, macroSnapshot) => {
    const nextAppointment = { ...appointment, turnsInStage: (appointment.turnsInStage || 0) + 1 };

    if (appointment.stage === "committee_hearing") {
      return {
        nextAppointment: { ...nextAppointment, stage: "committee_vote", turnsInStage: 0, passLikelihood: 100, lobbyUsedStage: null },
        nextMacroState: macroSnapshot,
        logs: [`${appointment.nomineeName} completed the committee hearing for ${appointment.officeLabel}.`],
      };
    }

    const appointmentVote = evaluateAppointment({ ...cg, factions: factionsSnapshot }, appointment.factionReactions);

    if (appointmentVote.passed && appointment.stage === "committee_vote") {
      return {
        nextAppointment: {
          ...nextAppointment,
          stage: "senate_vote",
          turnsInStage: 0,
          factionVotes: appointmentVote.factionVotes,
          passLikelihood: appointmentVote.passLikelihood,
          committeeVote: appointmentVote,
          lobbyUsedStage: null,
        },
        nextMacroState: macroSnapshot,
        logs: [`${appointment.nomineeName} cleared committee and is headed to the Senate floor.`],
      };
    }

    if (appointmentVote.passed && appointment.stage === "senate_vote") {
      const confirmationRecord = {
        id: `${appointment.officeId}_${effectiveWeek}_${appointment.nomineeName}`,
        officeId: appointment.officeId,
        officeLabel: appointment.officeLabel,
        nomineeName: appointment.nomineeName,
        personality: appointment.personality,
        passed: true,
        committeeYes: appointment.committeeVote?.senateYes ?? 100,
        committeeNo: appointment.committeeVote?.senateNo ?? 0,
        senateYes: appointmentVote.senateYes,
        senateNo: appointmentVote.senateNo,
        year: Math.ceil(effectiveWeek / 52),
        weekOfYear: ((effectiveWeek - 1) % 52) + 1,
      };

      if (appointment.officeId === "fed_chair") {
        return {
          nextAppointment: null,
          nextMacroState: {
            ...macroSnapshot,
            fedVacant: false,
            fedChairName: appointment.nomineeName,
            fedChairStartWeek: effectiveWeek,
            governorPersonality: appointment.personality,
            fedDecisionSummary: `${appointment.nomineeName} was confirmed as ${appointment.personality.toLowerCase()} Fed chair by the Senate ${appointmentVote.senateYes}-${appointmentVote.senateNo}.`,
          },
          confirmationRecord,
          notification: { type: "appointment_success", message: `Senate confirmed ${appointment.nomineeName} as Fed chair.`, tab: "cabinet" },
          logs: [`${appointment.nomineeName} was confirmed as Federal Reserve Chair.`],
        };
      }

      if (appointment.officeId === "sec_state") {
        return {
          nextAppointment: null,
          nextMacroState: macroSnapshot,
          confirmationRecord,
          notification: { type: "appointment_success", message: `Senate confirmed ${appointment.nomineeName} as Secretary of State.`, tab: "cabinet" },
          logs: [`${appointment.nomineeName} was confirmed as Secretary of State.`],
          secStateConfirmed: {
            name: appointment.nomineeName,
            factionId: appointment.nomineeFactionId,
          },
        };
      }
    }

    const confirmationRecord = {
      id: `${appointment.officeId}_${effectiveWeek}_${appointment.nomineeName}`,
      officeId: appointment.officeId,
      officeLabel: appointment.officeLabel,
      nomineeName: appointment.nomineeName,
      personality: appointment.personality,
      passed: false,
      committeeYes: appointment.stage === "senate_vote"
        ? (appointment.committeeVote?.senateYes ?? 100)
        : appointmentVote.senateYes,
      committeeNo: appointment.stage === "senate_vote"
        ? (appointment.committeeVote?.senateNo ?? 0)
        : appointmentVote.senateNo,
      senateYes: appointment.stage === "senate_vote" ? appointmentVote.senateYes : 0,
      senateNo: appointment.stage === "senate_vote" ? appointmentVote.senateNo : 0,
      year: Math.ceil(effectiveWeek / 52),
      weekOfYear: ((effectiveWeek - 1) % 52) + 1,
    };

    if (appointment.officeId === "fed_chair") {
      const replacementName = pickFedChairName(nameRegistryRef.current);
      return {
        nextAppointment: buildAppointmentProcess({
          officeId: "fed_chair",
          officeLabel: "Federal Reserve Chair",
          nomineeName: replacementName,
          personality: appointment.personality,
        }),
        nextMacroState: {
          ...macroSnapshot,
          fedVacant: true,
          fedDecisionSummary: `${replacementName} is the new ${appointment.personality.toLowerCase()} Fed nominee after the Senate rejected ${appointment.nomineeName}.`,
        },
        confirmationRecord,
        notification: { type: "appointment_fail", message: `Senate rejected ${appointment.nomineeName} for ${appointment.officeLabel}.`, tab: "cabinet" },
        logs: [
          `${appointment.nomineeName} was rejected for ${appointment.officeLabel}.`,
          `${replacementName} was automatically nominated to replace the rejected Fed chair nominee.`,
        ],
      };
    }

    const candidates = generateSecStateCandidates(pp, nameRegistryRef.current);
    return {
      nextAppointment: null,
      nextMacroState: macroSnapshot,
      confirmationRecord,
      notification: { type: "appointment_fail", message: `Senate rejected ${appointment.nomineeName} for ${appointment.officeLabel}.`, tab: "cabinet" },
      logs: [
        `${appointment.nomineeName} was rejected for ${appointment.officeLabel}.`,
        "A new Secretary of State shortlist has been generated.",
      ],
      secStateRejected: { candidates },
    };
  }, [buildAppointmentProcess, cg, pp]);

  const fastTrackAppointment = useCallback(() => {
    if (!pendingAppointment?.isHighPriority) return;
    if (pendingAppointment.lobbyUsedStage === pendingAppointment.stage) return;

    const result = resolveAppointmentStep(pendingAppointment, { ...cg.factions }, week, { ...macroState });
    result.logs?.forEach(addLog);
    if (result.notification) addNotification(result.notification);
    if (result.confirmationRecord) setConfirmationHistory(prev => [...prev, result.confirmationRecord]);

    let finalFactions = { ...cg.factions };
      if (result.secStateConfirmed) {
        const settled = settleSecStatePromises(finalFactions, result.secStateConfirmed.factionId, result.secStateConfirmed.name);
        finalFactions = { ...settled.nextFactions };
        settled.logs.forEach(addLog);
        if (settled.broken.length > 0) setBrokenPromises(prev => [...prev, ...settled.broken]);
        setPromises(settled.remainingPromises);
        setEngagement(prev => Math.min(50, prev + 7));
        setCabinet(prev => ({
          ...prev,
          secState: {
          ...prev.secState,
          occupantName: result.secStateConfirmed.name,
          factionId: result.secStateConfirmed.factionId,
          party: finalFactions[result.secStateConfirmed.factionId]?.party || null,
          startWeek: week,
          candidates: [],
          selectedCandidateId: null,
        },
      }));
    } else if (result.secStateRejected) {
      setCabinet(prev => ({
        ...prev,
        secState: {
          ...prev.secState,
          occupantName: null,
          factionId: null,
          party: null,
          startWeek: null,
          candidates: result.secStateRejected.candidates,
          selectedCandidateId: null,
        },
      }));
    }

    setCG(prev => ({ ...prev, factions: finalFactions }));
    setMacroState(result.nextMacroState);
    setPendingAppointment(result.nextAppointment);
    refreshPromiseOffers({
      factions: finalFactions,
      cabinetState: {
        ...cabinet,
        secState: result.nextAppointment?.officeId === "sec_state"
          ? cabinet.secState
          : {
            ...cabinet.secState,
            candidates: result.nextAppointment ? cabinet.secState.candidates : [],
          },
      },
      pendingAppointment: result.nextAppointment,
    });
  }, [addLog, addNotification, cabinet, cg, macroState, pendingAppointment, refreshPromiseOffers, resolveAppointmentStep, settleSecStatePromises, week]);

  const lobbyAppointment = useCallback(() => {
    if (pendingAppointment?.officeId !== "sec_state") return;

    const success = Math.random() < 0.66;
    const boostedReactions = Object.fromEntries(
      Object.entries(pendingAppointment.factionReactions || {}).map(([fid, reaction]) => [
        fid,
        Math.max(-0.95, Math.min(0.95, reaction + (success ? 0.04 : 0))),
      ])
    );
    const appointmentVote = evaluateAppointment({ ...cg, factions: cg.factions }, boostedReactions);

    setPendingAppointment(prev => ({
      ...prev,
      factionReactions: boostedReactions,
      factionVotes: appointmentVote.factionVotes,
      passLikelihood: appointmentVote.passLikelihood,
      lobbyUsedStage: prev.stage,
    }));

    addLog(`${surrogates.find(s => s.id === "s1")?.name || "Senior Advisor"} ${success ? "improved" : "failed to improve"} Senate sentiment for ${pendingAppointment.nomineeName}.`);
  }, [addLog, cg, pendingAppointment, surrogates]);

  const fireEvent = useCallback((event, nextStats, eventWeek, options = {}) => {
    const { isSpecial = false, macro = macroState } = options;
    let updatedStats = { ...nextStats };
    let updatedMacro = macro;
    if (event.unique) setUsedEv(p => new Set([...p, event.id]));
    ({ stats: updatedStats, macroState: updatedMacro } = applyEffectsBundle(updatedStats, updatedMacro, event.effects || {}, event));
    setStats(updatedStats);
    setMacroState(updatedMacro);
    setCurEv(event);
    if (isSpecial) setLastSpecialEventWeek(eventWeek);
    return updatedStats;
  }, [applyEffectsBundle, macroState]);

  const pickRandomEvent = useCallback((pool) => {
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const start = () => {
    if (!pp || !pf || !pn.trim()) return;
    nameRegistryRef.current = createNameRegistry();
    const freshFedChairName = nameRegistryRef.current.drawName("Fed Chair");
    const c = generateCongress(pp, pf, nameRegistryRef.current);
    const freshMacroState = createInitialMacroState(freshFedChairName);
    const freshStats = syncDerivedStats({ ...INITIAL_STATS }, freshMacroState);
    setCG(c);
    setMacroState(freshMacroState);
    setStats(freshStats);
    setPrev(freshStats);
    const h = {};
    Object.keys(freshStats).forEach(k => h[k] = [freshStats[k]]);
    setHist(h);
    setWeek(1);
    setAct(0);
    setMaxActions(4);
    setUsedPol(new Set());
    setUsedEv(new Set());
    setActiveBill(null);
    setPFx([]);
    setStBon({});
    setStateHist({});
    setCountries(COUNTRIES_INIT.map(c => ({ ...c })));
    setBillRecord([]);
    setBillLikelihood(null);
    setCongressTab("overview");
    setPromises([]);
    setPromiseOffers(buildYearlyPromiseOffers({
      factions: c.factions,
      playerParty: pp,
      usedPol: new Set(),
      billCooldowns: {},
      week: 1,
      cabinetState: createInitialCabinetState(),
      pendingAppointment: null,
    }));
    setSurrogates(makeSurrogates(nameRegistryRef.current));
    setBillCooldowns({});
    setForeignVisitResult(null);
    setSurrogateUI({});
    setFactionHist({});
    setVisitedCountries({});
    setLockedBills(new Set());
    setReconciliationCooldown(0);
    setShowBudget(false);
    setBudgetDraft(null);
    setPendingPromise(null);
    setBrokenPromises([]);
    setNotifications([]);
    setCoachCooldown(0);
    setRecentDisasters({});
    setActiveOrders([]);
    setDiscoveredHiddenOrders([]);
    setEoIssuedCount({});
    setPassedLegislation({});
    setLastSpecialEventWeek(0);
    setExecutiveOverreach(20);
    setOverreachLastIncreasedWeek(0);
    setOverreachLowSinceWeek(1);
    setPendingChainEvents([]);
    setActionsSubTab("orders");
    setSelectedEO(null);
    setEoChoice({});
    setEoResult(null);
    setPendingNegotiation(null);
    setAppliedAmendments({});
    setBillFactionVotes(null);
    setPendingSignature(null);
    setPendingAppointment(null);
    setConfirmationHistory([]);
    setCabinet(createInitialCabinetState());
    setCongressHistory([buildHistorySnapshot(c, 1, 0, 0, freshStats.approvalRating, 0, freshStats.approvalRating, false, { isInitial: true })]);
    setMidtermResults(null);
    setShowMidtermModal(false);
    setPendingCongressUpdate(null);
    setShowInaugurationModal(false);
    setCampaignSeasonStarted(false);
    setCampaignActivity(0);
    setPollingNoise(0);
    setIsPresidentialElection(false);
    setLog([{ week: 1, text: `President ${pn.trim()} and Vice President ${vpn.trim()} inaugurated. ${PARTIES[pp]} hold both chambers. Base: ${FACTION_DATA[pp].find(f => f.id === pf)?.name}.` }]);
    setScreen(2);
  };

  const applyStateEffects = action => {
    const b = { ...stBon };
    if (action.stateEffects?.farmHeavy) STATE_DATA.forEach(s => { if (s.farm > 0.15) b[s.abbr] = (b[s.abbr] || 0) + action.stateEffects.weight; });
    if (action.stateEffects?.economy) STATE_DATA.forEach(s => { if (action.stateEffects.economy.includes(s.economy)) b[s.abbr] = (b[s.abbr] || 0) + (action.stateEffects.weight || 0.02); });
    if (action.stateEffects?.region) STATE_DATA.forEach(s => { if (action.stateEffects.region.includes(s.region)) b[s.abbr] = (b[s.abbr] || 0) + (action.stateEffects.weight || 0.02); });
    if (action.stateEffects?.minUrbanization) STATE_DATA.forEach(s => { if ((s.urbanization || 0) >= action.stateEffects.minUrbanization) b[s.abbr] = (b[s.abbr] || 0) + (action.stateEffects.weight || 0.02); });
    if (action.stateEffects?.maxUrbanization) STATE_DATA.forEach(s => { if ((s.urbanization || 1) <= action.stateEffects.maxUrbanization) b[s.abbr] = (b[s.abbr] || 0) + (action.stateEffects.weight || 0.02); });
    setStBon(b);
  };

  const advance = () => {
    // ── Block D: Inauguration — apply pending congress update at start of new year ──
    const nwPre = week + 1;
    const wiyPre = ((nwPre - 1) % 52) + 1;
    let inauguratedFactions = null;
    if (wiyPre === 1 && pendingCongressUpdate) {
      inauguratedFactions = pendingCongressUpdate.newFactions;
      setShowInaugurationModal(true);
      setPendingCongressUpdate(null);
      const netH = pendingCongressUpdate.houseNetChange;
      const netS = pendingCongressUpdate.senateNetChange;
      addLog(`New Congress sworn in. Party ${netH >= 0 ? "gained" : "lost"} ${Math.abs(netH)} House seat${Math.abs(netH) !== 1 ? "s" : ""} and ${netS >= 0 ? "gained" : "lost"} ${Math.abs(netS)} Senate seat${Math.abs(netS) !== 1 ? "s" : ""}.`);
    }

    setVisitTypeCounts({});
    setPrev({ ...stats });
    let ns = { ...stats };
    let nextMacroState = { ...macroState, impulses: { ...macroState.impulses } };
    const { macroState: advancedMacroState, derived } = advanceMacroEconomy(nextMacroState, ns, week + 1);
    nextMacroState = advancedMacroState;
    if (Math.abs(nextMacroState.fedFundsRate - macroState.fedFundsRate) > 0.049) {
      const rateDelta = nextMacroState.fedFundsRate - macroState.fedFundsRate;
      addNotification({
        type: "fed_update",
        message: `${nextMacroState.fedChairName} ${rateDelta > 0 ? "raised" : "cut"} rates to ${nextMacroState.fedFundsRate.toFixed(2)}%.`,
        tab: "cabinet",
      });
      addLog(`Federal Reserve ${rateDelta > 0 ? "raised" : "cut"} rates to ${nextMacroState.fedFundsRate.toFixed(2)}%.`);
    }
    // Birth rate declines 1.5%/year (secular trend), 52 weeks/year
    ns.birthRate = Math.max(6, ns.birthRate * (1 - 0.015 / 52));
    // Death rate modulated by healthcare spending (baseline $1520B → 9.0/1k)
    ns.deathRate = Math.max(7, Math.min(12, 9.0 + (1520 - ns.healthcareSpending) / 1520 * 0.6));
    // Population: natural growth + net immigration each week
    const naturalGrowthPerWeek = (ns.birthRate - ns.deathRate) / 1000 * ns.population / 52;
    const immigrationPerWeek = ns.immigrationRate * 1e6 / 52;
    ns.population = Math.round(ns.population + naturalGrowthPerWeek + immigrationPerWeek);
    ns.unemployment = derived.unemployment;
    ns.inflation = derived.inflation;
    ns.gasPrice = Math.max(2, Math.min(7, ns.gasPrice + (Math.random() - 0.5) * 0.02));
    ns.crimeRate = Math.max(2, Math.min(10, ns.crimeRate + (Math.random() - 0.5) * 0.01));
    ns.tradeBalance = Math.max(-180, Math.min(40, ns.tradeBalance - nextMacroState.outputGap * 0.45 + nextMacroState.netExportsShare * 20 + (Math.random() - 0.5) * 0.4));
    const immEconDrift = (nextMacroState.realGdpGrowth - 2.5) * 0.003 - (ns.unemployment - 5) * 0.002;
    ns.immigrationRate = Math.max(0.1, Math.min(3.5, ns.immigrationRate + immEconDrift + (Math.random() - 0.5) * 0.01));

    pFx.filter(p => p.week <= week + 1).forEach(p => {
      ({ stats: ns, macroState: nextMacroState } = applyEffectsBundle(ns, nextMacroState, p.effects || {}, p));
      addLog(`Policy effect: ${p.name}`);
    });
    setPFx(p => p.filter(x => x.week > week + 1));
    ns = syncDerivedStats(ns, nextMacroState);

    // ── Block A: Campaign season kickoff ─────────────────────────────────────
    const nwA = week + 1;
    const yrA = Math.ceil(nwA / 52);
    const wiyA = ((nwA - 1) % 52) + 1;
    const isElectionYearA = yrA >= 2 && yrA % 2 === 0;
    const isPresidentialYearA = yrA >= 4 && yrA % 4 === 0;
    if (wiyA === 28 && isElectionYearA && !campaignSeasonStarted) {
      setCampaignSeasonStarted(true);
      setCampaignActivity(0);
      setPollingNoise((Math.random() - 0.5) * 0.30);
      setIsPresidentialElection(isPresidentialYearA);
      const msg = isPresidentialYearA
        ? `Year ${yrA} election campaign begins — elections in 16 weeks. Presidential race not simulated; Congressional seats will be updated.`
        : `Year ${yrA} midterm campaign season begins — elections in 16 weeks. Use surrogates and visits to boost party enthusiasm.`;
      addNotification({ type: "election_warning", message: msg, tab: "party" });
      addLog(`Year ${yrA} ${isPresidentialYearA ? "election" : "midterm"} campaign season begins.`);
    }

    // Bill progression + unity updates
    // Use inaugurated factions if this is inauguration week, so weekly drift
    // is applied on top of the new post-election composition (not stale cg.factions).
    const nf = { ...(inauguratedFactions || cg.factions) };

    // Clear any pending negotiation — if player advances without acting, apply walk-away trust penalty
    let negWalkAwayFid = null;
    if (pendingNegotiation) {
      negWalkAwayFid = pendingNegotiation.eligibleFactionIds?.[0] || null;
      setPendingNegotiation(null);
    }

    // Weekly unity drift for all factions (±3 random)
    const clampU = v => Math.max(20, Math.min(95, v));
    const leaderReplace = [];
    Object.keys(nf).forEach(fid => {
      nf[fid] = { ...nf[fid], unity: clampU(nf[fid].unity + (Math.random() * 6 - 3)) };
      // Auto-replace leader if unity < 25
      if (nf[fid].unity < 25) {
        const newLeader = {
          name: nameRegistryRef.current.drawName("Leader"),
          charisma: 1 + Math.floor(Math.random() * 10),
          authority: 1 + Math.floor(Math.random() * 10),
          sincerity: 1 + Math.floor(Math.random() * 10),
        };
        nf[fid] = { ...nf[fid], leader: newLeader, unity: clampU(nf[fid].unity + 15) };
        leaderReplace.push({ faction: nf[fid].name, leader: newLeader.name });
      }
    });

    // Approval-based unity effect on player faction
    if (pf && nf[pf]) {
      const curApproval = natA;
      if (curApproval > 55) nf[pf] = { ...nf[pf], unity: clampU(nf[pf].unity + 2) };
      else if (curApproval < 40) nf[pf] = { ...nf[pf], unity: clampU(nf[pf].unity - 3) };
    }

    let billPassed = false;
    let billDied = false;
    let billFactionReactions = null;

    if (activeBill) {
      const stageIdx = BILL_STAGES.findIndex(s => s.id === activeBill.stage);
      const result = calcStageAdvance(activeBill.act, cg, activeBill.stage, pf, activeBill.isBudget || false);
      setBillLikelihood(result.passLikelihood);
      setBillFactionVotes(result.factionVotes || null);

      if (result.advance) {
        if (stageIdx >= BILL_STAGES.length - 1) {
          // Bill passed all stages — queue for presidential action (sign or veto)
          addLog(`${activeBill.act.name} passed Congress — awaiting presidential signature`);
          setPendingSignature({
            act: activeBill.act,
            votes: result.votes,
            factionVotes: result.factionVotes || null,
            isBudget: activeBill.isBudget || false,
            budgetDraft: activeBill.budgetDraft || null,
          });
          setActiveBill(null);
          setBillLikelihood(null);
          setBillFactionVotes(null);
        } else {
          // Advance to next stage
          const nextStage = BILL_STAGES[stageIdx + 1].id;
          addLog(`${activeBill.act.name} advanced to ${BILL_STAGES[stageIdx + 1].label}`);
          setActiveBill(b => ({ ...b, stage: nextStage, turnsInStage: 0, consecutiveFails: 0, negotiated: false }));
          // Immediately compute vote breakdown for the new stage using updated factions
          const nextResult = calcStageAdvance(activeBill.act, { ...cg, factions: nf }, nextStage, pf, activeBill.isBudget || false);
          setBillLikelihood(nextResult.passLikelihood);
          setBillFactionVotes(nextResult.factionVotes || null);
        }
      } else {
        // Failed this turn
        const newConsecFails = activeBill.consecutiveFails + 1;
        const newTotalFails = activeBill.fails + 1;
        addLog(`${activeBill.act.name} stalled at ${BILL_STAGES[stageIdx].label} (${newConsecFails}/3)`);

        if (newConsecFails >= 3) {
          // Bill dies
          addLog(`${activeBill.act.name} DIED IN CONGRESS after repeated failures`);
          ns.approvalRating = (ns.approvalRating || 50) - 2;
          billDied = true;
          billFactionReactions = activeBill.act.factionReactions;
          Object.keys(nf).forEach(fid => {
            nf[fid] = { ...nf[fid], trust: Math.max(5, nf[fid].trust - 3) };
          });
          setBillRecord(r => [...r, {
            name: activeBill.act.name,
            week,
            passed: false,
            senateYes: result.votes.senateYes,
            senateNo: result.votes.senateNo,
            houseYes: result.votes.houseYes,
            houseNo: result.votes.houseNo,
          }]);
          if (activeBill.isBudget) {
            setReconciliationCooldown(week + 8);
            setUsedPol(p => { const np = new Set(p); np.delete("budget_reconciliation"); return np; });
          } else {
            // Allow retry after 6 weeks
            setUsedPol(p => { const np = new Set(p); np.delete(activeBill.act.id); return np; });
            setBillCooldowns(c => ({ ...c, [activeBill.act.id]: week + 6 }));
          }
          // Show as event
          setCurEv({
            name: `${activeBill.act.name} Dies in Congress`,
            desc: `After three consecutive failures to advance, ${activeBill.act.name} has been shelved.${activeBill.isBudget ? " You may try again in 8 weeks." : " You may attempt to reintroduce it in 6 weeks."}`,
            choices: [{ text: "Accept the setback and move on", result: "Bill abandoned", effects: {} }],
          });
          setActiveBill(null);
          setBillLikelihood(null);
        } else {
          // Check if negotiation is available (only if not already negotiated at this stage stall)
          const billAmends = BILL_AMENDMENTS[activeBill.act.id];
          const alreadyApplied = appliedAmendments[activeBill.act.id] || [];
          const availAmends = billAmends
            ? billAmends.filter(a => !alreadyApplied.includes(a.id)).slice(0, 2)
            : [];
          const eligibleFids = availAmends.length > 0
            ? Object.values(cg.factions)
                .filter(f => {
                  const react = activeBill.act.factionReactions[f.id] ?? -0.35;
                  return react >= -0.3 && react <= 0.3
                    && (f.relationship || 50) >= 35
                    && (f.trust || 50) >= 30;
                })
                .map(f => f.id)
            : [];

          if (!activeBill.negotiated && eligibleFids.length > 0) {
            setPendingNegotiation({
              amendments: availAmends,
              eligibleFactionIds: eligibleFids,
              stage: activeBill.stage,
            });
            setActiveBill(b => ({
              ...b,
              fails: newTotalFails,
              consecutiveFails: newConsecFails,
              turnsInStage: b.turnsInStage + 1,
              negotiated: true,
            }));
          } else {
            setActiveBill(b => ({
              ...b,
              fails: newTotalFails,
              consecutiveFails: newConsecFails,
              turnsInStage: b.turnsInStage + 1,
            }));
          }
        }
      }
    }

    // Unity effects from bill outcome
    if (billFactionReactions) {
      Object.keys(nf).forEach(fid => {
        const reaction = billFactionReactions[fid] || 0;
        const supports = reaction > 0.2;
        const opposes = reaction < -0.2;
        if (billPassed) {
          if (supports) nf[fid] = { ...nf[fid], unity: clampU(nf[fid].unity + 5) };
          if (opposes) nf[fid] = { ...nf[fid], unity: clampU(nf[fid].unity - 3) };
        } else if (billDied) {
          if (opposes) nf[fid] = { ...nf[fid], unity: clampU(nf[fid].unity + 3) };
          if (supports) nf[fid] = { ...nf[fid], unity: clampU(nf[fid].unity - 2) };
        }
      });
    }

    // Apply walk-away negotiation trust penalty if player advanced without acting
    if (negWalkAwayFid && nf[negWalkAwayFid]) {
      nf[negWalkAwayFid] = { ...nf[negWalkAwayFid], trust: Math.max(5, nf[negWalkAwayFid].trust - 3) };
      addLog(`Walked away from negotiations — trust with ${nf[negWalkAwayFid].name} decreased.`);
    }

    // Executive overreach faction penalties — applied every 2 weeks, scaled continuously
    const nwForOverreach = week + 1;
    if (nwForOverreach % 2 === 0 && executiveOverreach > 31) {
      const allyList = ALLIED_FACTIONS[pp] || [];
      const oppList  = OPPOSITION_FACTIONS[pp] || [];
      // t: 0 at overreach=31, 1 at overreach=100 — drives both penalty size and log threshold
      const t = Math.max(0, (executiveOverreach - 31)) / 69;
      allyList.forEach(fid => {
        if (!nf[fid]) return;
        const isBase   = fid === pf;
        const maxPen   = isBase ? 2 : 4;   // base faction barely affected; other allies more so
        const floor    = isBase ? 45 : 25; // base faction protected; other allies can fall further
        const penalty  = t * maxPen;
        nf[fid] = { ...nf[fid], relationship: Math.max(floor, nf[fid].relationship - penalty) };
      });
      oppList.forEach(fid => {
        if (!nf[fid]) return;
        const penalty = t * 6; // opposition takes the hardest hit
        nf[fid] = { ...nf[fid], relationship: Math.max(10, nf[fid].relationship - penalty) };
      });
      if (t > 0.42) { // overreach > ~60
        addLog("HIGH executive overreach is seriously damaging all faction relationships.");
      } else if (t > 0.14) { // overreach > ~41
        addLog("Elevated executive overreach is straining faction relationships.");
      }
    }

    // Minor diplomatic metric faction effects (every tick)
    if (engagement > 30) ['prog','mod_dem','blue_dog','mod_rep'].forEach(fid => {
      if (nf[fid]) nf[fid] = { ...nf[fid], relationship: Math.max(5, Math.min(95, nf[fid].relationship + 0.15)) };
    });
    if (engagement < 20) {
      if (nf['freedom']) nf['freedom'] = { ...nf['freedom'], relationship: Math.max(5, Math.min(95, nf['freedom'].relationship + 0.15)) };
    }
    if (powerProjection > 38) ['mod_rep','trad_con','blue_dog'].forEach(fid => {
      if (nf[fid]) nf[fid] = { ...nf[fid], relationship: Math.max(5, Math.min(95, nf[fid].relationship + 0.15)) };
    });
    if (powerProjection < 32) {
      if (nf['prog']) nf['prog'] = { ...nf['prog'], relationship: Math.max(5, Math.min(95, nf['prog'].relationship + 0.15)) };
    }
    if (globalTension > 35) {
      if (nf['prog']) nf['prog'] = { ...nf['prog'], relationship: Math.max(5, Math.min(95, nf['prog'].relationship - 0.5)) };
    }

    // Log leader replacements and commit faction changes
    setCG(prev => ({ ...prev, factions: nf }));
    // Track faction history
    setFactionHist(prev => {
      const h = { ...prev };
      Object.values(nf).forEach(f => {
        h[f.id] = {
          trust: [...(prev[f.id]?.trust || []), f.trust || 50].slice(-52),
          rel: [...(prev[f.id]?.rel || []), f.relationship || 50].slice(-52),
          unity: [...(prev[f.id]?.unity || []), f.unity || 50].slice(-52),
        };
      });
      return h;
    });
    leaderReplace.forEach(({ faction, leader }) => {
      addLog(`${faction} replaced their leader with ${leader}`);
    });

    if (pendingAppointment) {
      const appointmentResult = resolveAppointmentStep(pendingAppointment, nf, week + 1, nextMacroState);
      appointmentResult.logs?.forEach(addLog);
      if (appointmentResult.notification) addNotification(appointmentResult.notification);
      if (appointmentResult.confirmationRecord) setConfirmationHistory(prev => [...prev, appointmentResult.confirmationRecord]);
      nextMacroState = appointmentResult.nextMacroState;
      setPendingAppointment(appointmentResult.nextAppointment);

      if (appointmentResult.secStateConfirmed) {
        const settled = settleSecStatePromises(nf, appointmentResult.secStateConfirmed.factionId, appointmentResult.secStateConfirmed.name);
        Object.assign(nf, settled.nextFactions);
        settled.logs.forEach(addLog);
        setPromises(settled.remainingPromises);
        if (settled.broken.length > 0) setBrokenPromises(prev => [...prev, ...settled.broken]);
        setEngagement(prev => Math.min(50, prev + 7));
        const updatedCabinetState = {
          ...cabinet,
          secState: {
            ...cabinet.secState,
            occupantName: appointmentResult.secStateConfirmed.name,
            factionId: appointmentResult.secStateConfirmed.factionId,
            party: nf[appointmentResult.secStateConfirmed.factionId]?.party || null,
            startWeek: week + 1,
            candidates: [],
            selectedCandidateId: null,
          },
        };
        setCabinet(prev => ({
          ...prev,
          secState: {
            ...prev.secState,
            occupantName: appointmentResult.secStateConfirmed.name,
            factionId: appointmentResult.secStateConfirmed.factionId,
            party: nf[appointmentResult.secStateConfirmed.factionId]?.party || null,
            startWeek: week + 1,
            candidates: [],
            selectedCandidateId: null,
          },
        }));
        refreshPromiseOffers({ factions: nf, cabinetState: updatedCabinetState, pendingAppointment: appointmentResult.nextAppointment });
      } else if (appointmentResult.secStateRejected) {
        const updatedCabinetState = {
          ...cabinet,
          secState: {
            ...cabinet.secState,
            occupantName: null,
            factionId: null,
            party: null,
            startWeek: null,
            candidates: appointmentResult.secStateRejected.candidates,
            selectedCandidateId: null,
          },
        };
        setCabinet(prev => ({
          ...prev,
          secState: {
            ...prev.secState,
            occupantName: null,
            factionId: null,
            party: null,
            startWeek: null,
            candidates: appointmentResult.secStateRejected.candidates,
            selectedCandidateId: null,
          },
        }));
        refreshPromiseOffers({ factions: nf, cabinetState: updatedCabinetState, pendingAppointment: appointmentResult.nextAppointment });
      }
    }

    ns = syncDerivedStats(ns, nextMacroState);
    const prevDeficit = stats.nationalDeficit;
    // Conservative faction relationship boost when deficit meaningfully reduced
    if (prevDeficit && ns.nationalDeficit < prevDeficit - 30) {
      ["trad_con", "freedom", "mod_rep"].forEach(fid => {
        if (nf[fid]) nf[fid] = { ...nf[fid], relationship: Math.min(95, nf[fid].relationship + 1) };
      });
    }
    // Debt changes by the signed weekly deficit share (B → T), so surpluses reduce it.
    ns.nationalDebt = Math.max(0, ns.nationalDebt + (ns.nationalDeficit / (52 * 1000)));
    ns.approvalRating = advanceApproval(ns, pp, week + 1);
    ns = syncDerivedStats(ns, nextMacroState);

    setStats(syncDerivedStats(ns, nextMacroState));
    setMacroState(nextMacroState);
    setHist(p => {
      const h = { ...p };
      Object.keys(ns).forEach(k => { h[k] = [...(p[k] || []), ns[k]].slice(-52); });
      return h;
    });

    // Record per-state approval history (compute once to avoid double-calculation with sA memo)
    const newSA = {};
    STATE_DATA.forEach(s => { newSA[s.abbr] = calcStateApproval(s, ns, pp, stBon); });
    setStateHist(prev => {
      const h = { ...prev };
      Object.entries(newSA).forEach(([abbr, val]) => {
        h[abbr] = [...(h[abbr] || []), val].slice(-52);
      });
      return h;
    });

    // Decay all state bonuses by 6% per week to prevent runaway approval
    setStBon(prev => {
      const d = {};
      Object.entries(prev).forEach(([k, v]) => {
        const decayed = v * 0.94;
        if (Math.abs(decayed) > 0.0001) d[k] = decayed;
      });
      return d;
    });

    // Warn player 12 weeks before promise deadline if bill not yet passed
    const nwCheck = week + 1;
    promises.forEach(p => {
      if (p.type === "bill" && p.deadline - nwCheck === 12 && !passedLegislation[p.billId]) {
        const bill = POLICY_ACTIONS.find(a => a.id === p.billId);
        const faction = nf[p.factionId];
        addNotification({
          type: "promise_warning",
          message: `Promise deadline in 12 weeks: pass "${bill?.name}" for ${faction?.name || p.factionId}.`,
          tab: "party",
        });
      }
    });

    // Process promise fulfillment and deadlines weekly.
    const remainingPromises = [];
    const newBrokenPromises = [];
    let promiseResolved = false;
    promises.forEach(p => {
      const fulfilled = p.type === "bill"
        ? !!passedLegislation[p.billId]
        : (cabinet.secState.occupantName && cabinet.secState.factionId === p.promisedFactionId);

      if (fulfilled) {
        addLog(`Promise kept: ${getPromiseLabel(p)}. ${nf[p.factionId]?.name} trust +${p.successTrustBoost || 5}.`);
        if (nf[p.factionId]) nf[p.factionId] = { ...nf[p.factionId], trust: Math.min(95, nf[p.factionId].trust + (p.successTrustBoost || 5)) };
        promiseResolved = true;
        return;
      }

      if (p.deadline <= week + 1) {
        addLog(`Broken promise: failed to ${getPromiseLabel(p)}. ${nf[p.factionId]?.name} relationship -${p.brokenRelPenalty || 10}, trust -${p.brokenTrustPenalty || 15}.`);
        if (nf[p.factionId]) nf[p.factionId] = { ...nf[p.factionId],
          relationship: Math.max(5, nf[p.factionId].relationship - (p.brokenRelPenalty || 10)),
          trust: Math.max(5, nf[p.factionId].trust - (p.brokenTrustPenalty || 15)),
        };
        newBrokenPromises.push({
          factionName: nf[p.factionId]?.name,
          promiseLabel: getPromiseLabel(p),
          relationshipLoss: p.brokenRelPenalty || 10,
          trustLoss: p.brokenTrustPenalty || 15,
        });
        promiseResolved = true;
        return;
      }

      remainingPromises.push(p);
    });
    if (promiseResolved) {
      setPromises(remainingPromises);
      refreshPromiseOffers({ factions: nf, cabinetState: cabinet, pendingAppointment });
    }
    if (newBrokenPromises.length > 0) setBrokenPromises(q => [...q, ...newBrokenPromises]);

    // Process surrogate tasks — compute completions first to avoid side effects inside updater
    const completedSurrogates = [];
    const updatedSurrogates = surrogates.map(s => {
      if (!s.busy) return s;
      const weeksLeft = s.busy.weeksLeft - 1;
      if (weeksLeft <= 0) { completedSurrogates.push(s); return { ...s, busy: null }; }
      return { ...s, busy: { ...s.busy, weeksLeft } };
    });
    setSurrogates(updatedSurrogates);

    completedSurrogates.forEach(s => {
      if (s.busy.type === "faction_rel") {
        setCG(prev2 => {
          const nf2 = { ...prev2.factions };
          if (nf2[s.busy.factionId]) nf2[s.busy.factionId] = { ...nf2[s.busy.factionId],
            relationship: Math.min(95, nf2[s.busy.factionId].relationship + s.busy.relBonus),
          };
          return { ...prev2, factions: nf2 };
        });
        addLog(`${s.name} completed: improved relations with ${s.busy.factionName} (+${s.busy.relBonus} relationship).`);
        addNotification({ type: "surrogate_done", message: `${s.name} improved relations with ${s.busy.factionName} (+${s.busy.relBonus} relationship).` });
      } else if (s.busy.type === "foreign_visit") {
        const relGain = Math.floor(Math.random() * 13) - 4; // -4 to +8
        const trustGain = Math.max(0, relGain > 0 ? Math.floor(relGain * 0.6 + Math.random() * 3) : Math.floor(Math.random() * 4) - 2);
        setCountries(p => p.map(c => {
          if (c.id !== s.busy.countryId) return c;
          const nc = { ...c,
            relationship: Math.max(0, Math.min(100, c.relationship + relGain)),
            trust: Math.max(0, Math.min(100, c.trust + trustGain)),
          };
          nc.status = nc.relationship >= 70 ? "ALLIED" : nc.relationship >= 50 ? "FRIENDLY" : nc.relationship >= 30 ? "NEUTRAL" : nc.relationship >= 15 ? "UNFRIENDLY" : "HOSTILE";
          return nc;
        }));
        const fxText = relGain >= 2 ? "Successful visit" : relGain < 0 ? "Visit caused friction" : "Uneventful visit";
        addLog(`${s.name} foreign visit to ${s.busy.countryName}: ${fxText} (rel ${relGain >= 0 ? "+" : ""}${relGain}).`);
        setEngagement(e => Math.min(50, e + 2));
        if (relGain >= 5) {
          ns.approvalRating = (ns.approvalRating || 50) + 1;
          setStats(syncDerivedStats({ ...ns }, macroState));
        }
        const relStr = `${relGain >= 0 ? "+" : ""}${relGain} relationship, +${trustGain} trust${relGain >= 5 ? ", +1 approval" : ""}`;
        addNotification({ type: "surrogate_done", message: `${s.name} returned from ${s.busy.countryName}: ${relStr}.` });
      } else if (s.busy.type === "coach") {
        const success = Math.random() < 0.66;
        if (success) {
          setCG(prev2 => {
            const nf2 = { ...prev2.factions };
            if (nf2[s.busy.factionId] && nf2[s.busy.factionId].leader) {
              const leader = { ...nf2[s.busy.factionId].leader };
              leader[s.busy.skill] = Math.min(10, (leader[s.busy.skill] || 1) + 1);
              nf2[s.busy.factionId] = { ...nf2[s.busy.factionId], leader };
            }
            return { ...prev2, factions: nf2 };
          });
          addLog(`${s.name} successfully coached ${s.busy.factionName} leader — ${s.busy.skill} +1.`);
        } else {
          addLog(`${s.name}'s coaching of ${s.busy.factionName} leader did not produce results.`);
        }
        setCoachCooldown(week + 8);
        addNotification({
          type: success ? "surrogate_done" : "surrogate_fail",
          message: success
            ? `${s.name}: ${s.busy.factionName} leader's ${s.busy.skill} improved (+1). Coaching available again in 8 weeks.`
            : `${s.name}: ${s.busy.factionName} leader was resistant to coaching. No improvement. Cooldown: 8 weeks.`,
        });
      }
    });

    const nw = week + 1;
    setWeek(nw);
    setNotifications(prev => prev.filter(n => nw - n.addedWeek < 2));
    setRecentDisasters(rd => Object.fromEntries(Object.entries(rd).filter(([, w]) => week - w < 4)));
    setAct(0);
    if (((nw - 1) % 52) + 1 === 1) {
      refreshPromiseOffers({
        factions: nf,
        week: nw,
        cabinetState: cabinet,
        pendingAppointment: pendingAppointment ? null : pendingAppointment,
      });
    }

    // ── Block B: Election trigger ─────────────────────────────────────────────
    const yrB = Math.ceil(nw / 52);
    const wiyB = ((nw - 1) % 52) + 1;
    const isElectionYearB = yrB >= 2 && yrB % 2 === 0;
    const isPresidentialYearB = yrB >= 4 && yrB % 4 === 0;
    if (wiyB === 44 && isElectionYearB && !pendingCongressUpdate) {
      const { partyEnthusiasm, oppEnthusiasm } = computeEnthusiasms(cg, pp, natA, executiveOverreach, passedLegislation, promises, campaignActivity);
      const { houseNetChange, senateNetChange, factionHouseChanges, factionSenateChanges } = computeSeatChanges(cg, pp, natA, partyEnthusiasm, oppEnthusiasm, isPresidentialYearB, campaignActivity);
      const newFactions = applyElectionSeats(cg.factions, factionHouseChanges, factionSenateChanges);
      const newFactionsWithRelEffects = applyPostElectionRelEffects(newFactions, houseNetChange, pp);
      const results = buildMidtermResults(cg, pp, yrB, natA, partyEnthusiasm, oppEnthusiasm, houseNetChange, senateNetChange, factionHouseChanges, factionSenateChanges, isPresidentialYearB);
      const snapshot = buildHistorySnapshot(cg, yrB, houseNetChange, senateNetChange, partyEnthusiasm, oppEnthusiasm, natA, isPresidentialYearB);
      setPendingCongressUpdate({ newFactions: newFactionsWithRelEffects, houseNetChange, senateNetChange, factionBreakdown: results.factionBreakdown });
      setMidtermResults(results);
      setShowMidtermModal(true);
      setCongressHistory(prev => [...prev, snapshot]);
      setCampaignSeasonStarted(false);
      setPollingNoise(0);
      const netH = houseNetChange;
      const netS = senateNetChange;
      addLog(`ELECTION RESULTS — Year ${yrB}: Party ${netH >= 0 ? "GAINED" : "LOST"} ${Math.abs(netH)} House seat${Math.abs(netH) !== 1 ? "s" : ""} and ${netS >= 0 ? "gained" : "lost"} ${Math.abs(netS)} Senate seat${Math.abs(netS) !== 1 ? "s" : ""}. Approval: ${Math.round(natA)}%. Party enthusiasm: ${Math.round(partyEnthusiasm)}, Opposition: ${Math.round(oppEnthusiasm)}.`);
    }

    // Overreach decay: fast decay above 31, then slow cooling toward 15 after 4 quiet weeks below 31.
    let nextOverreach = executiveOverreach;
    let nextOverreachLowSinceWeek = overreachLowSinceWeek;
    if (nextOverreach > 31) {
      nextOverreachLowSinceWeek = 0;
      if (nw - overreachLastIncreasedWeek >= 2) {
        nextOverreach = Math.max(31, nextOverreach - (nextOverreach > 60 ? 5 : 3));
      }
      if (nextOverreach <= 31) nextOverreachLowSinceWeek = nw;
    } else {
      if (!nextOverreachLowSinceWeek) nextOverreachLowSinceWeek = week;
      if (nw - nextOverreachLowSinceWeek >= 4 && nw - overreachLastIncreasedWeek >= 4) {
        nextOverreach = Math.max(15, nextOverreach - 1);
      }
    }
    setExecutiveOverreach(nextOverreach);
    setOverreachLowSinceWeek(nextOverreach <= 31 ? nextOverreachLowSinceWeek : 0);

    // ── Diplomatic Metrics Update ────────────────────────────────────────────

    // 1. Engagement decay (0.5/week, only after first 8 weeks, only if no trip in 6+ weeks)
    const willDecayEng = nw > 8 && (lastForeignTripWeek === 0 || nw - lastForeignTripWeek > 6);
    const secStateVacantPenalty = nw >= 8 && !cabinet.secState.occupantName ? 3 : 0;
    const newEngagement = Math.max(0, engagement - (willDecayEng ? 0.5 : 0) - secStateVacantPenalty);
    if (willDecayEng) setEngagement(() => newEngagement);
    else if (secStateVacantPenalty > 0) setEngagement(() => newEngagement);

    if (nw === 8 && !cabinet.secState.occupantName) {
      addNotification({
        type: "appointment_fail",
        message: "Secretary of State is still vacant. International engagement will now fall by 3 each week until the post is filled.",
        tab: "cabinet",
      });
      addLog("Secretary of State remains vacant at week 8. International engagement will now drop by 3 each week.");
    }

    // 2. Power projection (one-time adjustment per spending change, capped ±6)
    const spendingChange = ns.militarySpending - lastMilitarySpending;
    const defDelta = spendingChange === 0 ? 0 : Math.max(-6, Math.min(6, spendingChange / 50));
    const newPowerProjection = Math.max(0, Math.min(50, powerProjection + defDelta));
    setPowerProjection(() => newPowerProjection);
    setLastMilitarySpending(ns.militarySpending);

    // 3. Global tension (detect country status degradations + random drift)
    const GREAT_POWERS_T = new Set(['india', 'uk', 'france', 'russia', 'china']);
    const STATUS_RANK_T = { ALLIED: 4, FRIENDLY: 3, NEUTRAL: 2, UNFRIENDLY: 1, HOSTILE: 0 };
    let tensionDelta = (Math.random() - 0.5) * 1.5; // ±0.75 random drift
    countries.forEach(c => {
      const prevSt = countryStatusSnapshot[c.id];
      if (!prevSt || prevSt === c.status) return;
      const prevRank = STATUS_RANK_T[prevSt] ?? -1;
      const currRank = STATUS_RANK_T[c.status] ?? -1;
      if (currRank >= prevRank) return;
      const levels = prevRank - currRank;
      if (GREAT_POWERS_T.has(c.id)) {
        tensionDelta += levels * 5;
      } else {
        for (let l = 0; l < levels; l++) {
          tensionDelta += (prevRank - l) === 1 ? 3 : 2; // UNFRIENDLY→HOSTILE = +3, others = +2
        }
      }
    });
    const newGlobalTension = Math.max(0, Math.min(50, globalTension + tensionDelta));
    setGlobalTension(() => newGlobalTension);
    setCountryStatusSnapshot(Object.fromEntries(countries.map(c => [c.id, c.status])));

    // 4. Diplomatic threshold notifications (crossing into bad territory)
    if (newEngagement < 20 && engagement >= 20 && !diplomacyThresholds.engagementLow) {
      addLog("International engagement has fallen to a low level.");
      addNotification({ type: "surrogate_fail", message: "International engagement is now low — foreign partners are losing interest." });
      setDiplomacyThresholds(t => ({ ...t, engagementLow: true }));
    } else if (newEngagement >= 20 && diplomacyThresholds.engagementLow) {
      setDiplomacyThresholds(t => ({ ...t, engagementLow: false }));
    }
    if (newPowerProjection < 32 && powerProjection >= 32 && !diplomacyThresholds.projectionWeak) {
      addLog("U.S. power projection has weakened below a major power threshold.");
      addNotification({ type: "surrogate_fail", message: "Power projection has weakened — the U.S. is no longer perceived as a major power." });
      setDiplomacyThresholds(t => ({ ...t, projectionWeak: true }));
    } else if (newPowerProjection >= 32 && diplomacyThresholds.projectionWeak) {
      setDiplomacyThresholds(t => ({ ...t, projectionWeak: false }));
    }
    if (newGlobalTension > 35 && globalTension <= 35 && !diplomacyThresholds.tensionHigh) {
      addLog("Global tension has risen to a high level. Progressives are alarmed.");
      addNotification({ type: "surrogate_fail", message: "Global tension is now high — this is straining the Progressive Caucus." });
      setDiplomacyThresholds(t => ({ ...t, tensionHigh: true }));
    } else if (newGlobalTension <= 35 && diplomacyThresholds.tensionHigh) {
      setDiplomacyThresholds(t => ({ ...t, tensionHigh: false }));
    }

    if (wiyPre === 1 && !nextMacroState.fedVacant && Math.random() < 0.2) {
      const vacancyState = { ...nextMacroState, fedVacant: true, fedDecisionSummary: "Chair vacancy pending Senate confirmation." };
      setMacroState(vacancyState);
      setCurEv(buildFedNominationEvent(nameRegistryRef.current));
      addLog("Federal Reserve Chair vacancy opened. Senate confirmation is required for a new governor.");
      return;
    }

    const { normalPool, specialPool, immediatePool } = generateDynamicEvents(
      ns,
      sA,
      usedEv,
      pp,
      nw,
      passedLegislation,
      countries
    );

    // Fire pending chain events (priority over regular events)
    const readyChain = pendingChainEvents.find(c => nw >= c.triggerAtWeek);
    if (readyChain) {
      setPendingChainEvents(prev => prev.filter(c => c !== readyChain));
      fireEvent(readyChain.event, ns, nw, { macro: nextMacroState });
      return;
    }

    const immediateEvent = pickRandomEvent(immediatePool);
    if (immediateEvent) {
      fireEvent(immediateEvent, ns, nw, { isSpecial: immediateEvent.category === "special", macro: nextMacroState });
      return;
    }

    if (nw % 4 === 0) {
      const selectedNormalEvent = Math.random() < NORMAL_EVENT_CHANCE ? pickRandomEvent(normalPool) : null;

      let selectedSpecialEvent = null;
      const specialCooldownActive = lastSpecialEventWeek > 0 && (nw - lastSpecialEventWeek) <= SPECIAL_COOLDOWN_WEEKS;
      if (!specialCooldownActive && Math.random() < SPECIAL_EVENT_GATE_CHANCE) {
        const passedSpecialEvents = rollEligibleSpecialEvents(
          specialPool,
          SPECIAL_EFFECTIVE_CHECKS_PER_YEAR,
          Math.random
        );
        selectedSpecialEvent = pickRandomEvent(passedSpecialEvents);
      }

      const chosenEvent = selectedSpecialEvent || selectedNormalEvent;
      if (chosenEvent) {
        fireEvent(chosenEvent, ns, nw, { isSpecial: chosenEvent.category === "special", macro: nextMacroState });
      }
    }
  };

  const handleEventChoice = choice => {
    setPrev({ ...stats });
    let ns = { ...stats };
    let nextMacroState = { ...macroState, impulses: { ...macroState.impulses } };
    ({ stats: ns, macroState: nextMacroState } = applyEffectsBundle(ns, nextMacroState, choice.effects || {}, { ...curEv, macroEffects: choice.macroEffects || {} }));
    // Schedule chain event if this choice triggers one
    if (choice.schedulesChain) {
      const { minDelay, maxDelay, outcomes } = choice.schedulesChain;
      const delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
      const roll = Math.random();
      let cumProb = 0;
      let chosenEv = outcomes[outcomes.length - 1].event;
      for (const o of outcomes) { cumProb += o.probability; if (roll < cumProb) { chosenEv = o.event; break; } }
      setPendingChainEvents(prev => [...prev, { triggerAtWeek: week + delay, event: chosenEv }]);
    }
    if (choice.factionEffects) {
      const nf = { ...cg.factions };
      Object.entries(choice.factionEffects).forEach(([fid, v]) => {
        if (nf[fid]) nf[fid] = { ...nf[fid], relationship: Math.max(5, Math.min(95, nf[fid].relationship + v * 8)) };
      });
      setCG({ ...cg, factions: nf });
    }
    if (curEv.engagementEffect) setEngagement(e => Math.max(0, Math.min(50, e + curEv.engagementEffect)));
    if (choice.tensionEffect) setGlobalTension(t => Math.max(0, Math.min(50, t + choice.tensionEffect)));
    if (choice.countryEffects) {
      setCountries(p => p.map(c => {
        const e = choice.countryEffects[c.id];
        if (!e) return c;
        const nc = { ...c };
        if (e.relationship) nc.relationship = Math.max(0, Math.min(100, nc.relationship + e.relationship));
        if (e.trust) nc.trust = Math.max(0, Math.min(100, nc.trust + e.trust));
        nc.status = nc.relationship >= 70 ? "ALLIED" : nc.relationship >= 50 ? "FRIENDLY" : nc.relationship >= 30 ? "NEUTRAL" : nc.relationship >= 15 ? "UNFRIENDLY" : "HOSTILE";
        return nc;
      }));
    }
    if (choice.stateBoost && curEv.affectedStates) {
      const b = { ...stBon };
      curEv.affectedStates.forEach(a => { b[a] = (b[a] || 0) + choice.stateBoost; });
      setStBon(b);
    }
    if (choice.fedGovernorChoice) {
      setPendingAppointment(buildAppointmentProcess({
        officeId: "fed_chair",
        officeLabel: "Federal Reserve Chair",
        nomineeName: choice.fedGovernorName || pickFedChairName(nameRegistryRef.current),
        personality: choice.fedGovernorChoice,
      }));
      nextMacroState = {
        ...nextMacroState,
        fedVacant: true,
        fedDecisionSummary: `${choice.fedGovernorName || "The nominee"} is moving through the Senate confirmation process.`,
      };
      addLog(`${choice.fedGovernorName || "A nominee"} was sent to the Senate as a ${choice.fedGovernorChoice.toLowerCase()} Fed chair.`);
      addNotification({ type: "fed_update", message: `${choice.fedGovernorName || "A nominee"} is now in the Fed confirmation process.`, tab: "cabinet" });
      ns = syncDerivedStats(ns, nextMacroState);
    }
    setStats(syncDerivedStats(ns, nextMacroState));
    setMacroState(nextMacroState);
    if (curEv.isDisaster && curEv.affectedStates) {
      setRecentDisasters(rd => {
        const nrd = { ...rd };
        curEv.affectedStates.forEach(abbr => { nrd[abbr] = week; });
        return nrd;
      });
    }
    addLog(`${curEv.name}: ${choice.result}`);
    setCurEv(null);
  };

  const propose = action => {
    if (act >= maxActions || usedPol.has(action.id) || activeBill) return;
    if (billCooldowns[action.id] && week < billCooldowns[action.id]) return;
    if (lockedBills.has(action.id)) return;
    const nf = { ...cg.factions };
    const allyIntro = new Set(ALLIED_FACTIONS[pp] || []);
    Object.entries(action.factionReactions).forEach(([fid, r]) => {
      if (!nf[fid]) return;
      const isAlly = allyIntro.has(fid);
      if (isAlly) {
        // Allied factions feel it strongly — cross-ideological bills damage both relationship and trust
        const relChange = r >= 0 ? r * 4 : r * 9;
        const trustChange = r >= 0 ? r * 2 : r * 6;
        nf[fid] = {
          ...nf[fid],
          relationship: Math.max(5, Math.min(95, nf[fid].relationship + relChange)),
          trust: Math.max(5, Math.min(95, nf[fid].trust + trustChange)),
        };
      } else {
        // Opposition factions: moderate relationship shift, minimal trust change (they already distrust you)
        const relChange = r * 3;
        const trustChange = r * 1;
        nf[fid] = {
          ...nf[fid],
          relationship: Math.max(5, Math.min(95, nf[fid].relationship + relChange)),
          trust: Math.max(5, Math.min(95, nf[fid].trust + trustChange)),
        };
      }
    });
    const updatedCG = { ...cg, factions: nf };
    setCG(updatedCG);
    setActiveBill({ act: action, stage: "committee", fails: 0, turnsInStage: 0, consecutiveFails: 0 });
    // Compute initial vote breakdown so Congressional Support shows immediately on introduction
    const initResult = calcStageAdvance(action, updatedCG, "committee", pf, false);
    setBillLikelihood(initResult.passLikelihood);
    setBillFactionVotes(initResult.factionVotes || null);
    setUsedPol(p => new Set([...p, action.id]));
    setBillCooldowns(c => { const nc = { ...c }; delete nc[action.id]; return nc; });
    setAct(n => n + 2); // costs 2 actions
    addLog(`${action.name} introduced — entering committee`);
  };

  const makePromise = (factionId, offer) => {
    if (!offer) return;
    if (offer.type === "cabinet" && cabinet.secState.occupantName) return;
    setPendingPromise({ factionId, ...offer });
  };

  const confirmPromise = () => {
    if (!pendingPromise) return;
    const { factionId, relBoost } = pendingPromise;
    const deadline = Math.ceil(week / 52) * 52;
    const nf = { ...cg.factions };
    if (nf[factionId]) nf[factionId] = { ...nf[factionId], relationship: Math.min(95, nf[factionId].relationship + relBoost) };
    setCG({ ...cg, factions: nf });
    setPromises(p => [...p, { ...pendingPromise, factionId, madeWeek: week, deadline }]);
    const faction = cg.factions[factionId];
    addLog(`Promised ${faction?.name}: will ${getPromiseLabel(pendingPromise)} by year end. Relationship +${relBoost}.`);
    setPendingPromise(null);
  };

  const assignSurrogate = (surrogateId, task) => {
    if (act >= maxActions) return;
    const surrogateName = surrogates.find(s => s.id === surrogateId)?.name;

    if (task.type === "visit") {
      // Pick random state and activity, respecting the same stateRestriction rules as the player
      const randState = STATE_DATA[Math.floor(Math.random() * STATE_DATA.length)];
      const validVisits = VISIT_TYPES.filter(v => {
        if (!v.stateRestriction) return true;
        if (v.stateRestriction === "border") return !!randState.border;
        if (v.stateRestriction === "wallstreet") return randState.abbr === "NY";
        if (v.stateRestriction === "disaster") return !!recentDisasters[randState.abbr];
        if (v.stateRestriction === "tribal") return !!randState.tribal;
        return false;
      });
      // Fall back to unrestricted visits if the chosen state has none that qualify
      const pool = validVisits.length > 0 ? validVisits : VISIT_TYPES.filter(v => !v.stateRestriction);
      const chosenVisit = pool[Math.floor(Math.random() * pool.length)];
      const b = { ...stBon };
      b[randState.abbr] = Math.min(0.10, (b[randState.abbr] || 0) + 0.008);
      if (chosenVisit.factionEffects) {
        const nf = { ...cg.factions };
        Object.entries(chosenVisit.factionEffects).forEach(([fid, v]) => {
          if (nf[fid]) nf[fid] = { ...nf[fid], relationship: Math.max(5, Math.min(95, nf[fid].relationship + v * 3)) };
        });
        setCG({ ...cg, factions: nf });
      }
      setStBon(b);
      setAct(n => n + 1);
      if (campaignSeasonStarted) setCampaignActivity(n => n + 1);
      setSurrogateUI(p => { const n = { ...p }; delete n[surrogateId]; return n; });
      addLog(`${surrogateName} visited ${randState.name}: ${chosenVisit.name} (50% effect).`);
      return;
    }

    if (task.type === "faction_rel") {
      setSurrogates(prev => prev.map(s => s.id === surrogateId ? { ...s, busy: task } : s));
      setSurrogateUI(p => { const n = { ...p }; delete n[surrogateId]; return n; });
      setAct(n => n + 1);
      if (campaignSeasonStarted) setCampaignActivity(n => n + 1);
      addLog(`${surrogateName} assigned to improve relations with ${task.factionName}.`);
      return;
    }

    if (task.type === "foreign_visit") {
      setSurrogates(prev => prev.map(s => s.id === surrogateId ? { ...s, busy: task } : s));
      setVisitedCountries(p => ({ ...p, [task.countryId]: week + 12 }));
      setSurrogateUI(p => { const n = { ...p }; delete n[surrogateId]; return n; });
      setAct(n => n + 1);
      if (campaignSeasonStarted) setCampaignActivity(n => n + 1);
      addLog(`${surrogateName} dispatched to ${task.countryName}.`);
      return;
    }

    if (task.type === "coach") {
      setSurrogates(prev => prev.map(s => s.id === surrogateId ? { ...s, busy: task } : s));
      setSurrogateUI(p => { const n = { ...p }; delete n[surrogateId]; return n; });
      setAct(n => n + 1);
      if (campaignSeasonStarted) setCampaignActivity(n => n + 1);
      addLog(`${surrogateName} assigned to coach ${task.factionName} leader (${task.skill}).`);
      return;
    }
  };

  const doForeignVisit = (countryId, isSurrogate = false, surrogateId = null) => {
    if (visitedCountries[countryId] && week < visitedCountries[countryId]) return;
    const country = countries.find(c => c.id === countryId);
    const presidentialCost = country?.region === "Americas" ? 2 : 3;
    const actionCost = isSurrogate ? 1 : presidentialCost;
    if (act + actionCost > maxActions) return;
    if (!country || country.status === "HOSTILE") return;

    if (isSurrogate && surrogateId) {
      // Queue as surrogate task
      const task = { type: "foreign_visit", countryId, countryName: country.name, description: `Foreign visit to ${country.name}`, weeksLeft: 1 };
      setSurrogates(prev => prev.map(s => s.id === surrogateId ? { ...s, busy: task } : s));
      setVisitedCountries(p => ({ ...p, [countryId]: week + 12 }));
      setSurrogateUI(p => { const n = { ...p }; delete n[surrogateId]; return n; });
      setAct(n => n + 1);
      setLastForeignTripWeek(week);
      addLog(`${surrogates.find(s => s.id === surrogateId)?.name} dispatched to ${country.name}.`);
      return;
    }

    // Presidential foreign visit — immediate result
    const relGain = Math.floor(Math.random() * 11); // 0-10
    const trustGain = Math.floor(Math.random() * 11);
    const factionFx = COUNTRY_FACTION_EFFECTS[countryId] || {};
    const ns = { ...stats };
    if (relGain >= 5) ns.approvalRating = (ns.approvalRating || 50) + 2;

    setCountries(p => p.map(c => {
      if (c.id !== countryId) return c;
      const nc = { ...c,
        relationship: Math.max(0, Math.min(100, c.relationship + relGain)),
        trust: Math.max(0, Math.min(100, c.trust + trustGain)),
      };
      nc.status = nc.relationship >= 70 ? "ALLIED" : nc.relationship >= 50 ? "FRIENDLY" : nc.relationship >= 30 ? "NEUTRAL" : nc.relationship >= 15 ? "UNFRIENDLY" : "HOSTILE";
      return nc;
    }));

    if (Object.keys(factionFx).length > 0) {
      const nf = { ...cg.factions };
      Object.entries(factionFx).forEach(([fid, v]) => {
        if (nf[fid]) nf[fid] = { ...nf[fid], relationship: Math.max(5, Math.min(95, nf[fid].relationship + v * 8)) };
      });
      setCG({ ...cg, factions: nf });
    }

    setStats(syncDerivedStats(ns, macroState));
    setAct(n => n + actionCost);
    if (campaignSeasonStarted) setCampaignActivity(n => n + 1);
    setVisitedCountries(p => ({ ...p, [countryId]: week + 52 }));
    setEngagement(e => Math.min(50, e + 4));
    setLastForeignTripWeek(week);

    const fxLines = Object.entries(factionFx).map(([fid, v]) => {
      const f = cg.factions[fid];
      return f ? `${f.name.split(" ")[0]}: ${v > 0 ? "+" : ""}${Math.round(v * 8)} rel` : null;
    }).filter(Boolean);

    setForeignVisitResult({
      countryName: country.name,
      relGain, trustGain,
      approvalGain: relGain >= 5 ? 2 : 0,
      factionLines: fxLines,
    });
    addLog(`Presidential visit to ${country.name}: +${relGain} relationship, +${trustGain} trust.`);
  };

  const doVisit = () => {
    if (act >= maxActions || !visitState || !visitType) return;
    const vt = VISIT_TYPES.find(v => v.id === visitType);
    const st = STATE_DATA.find(s => s.abbr === visitState);
    if (!vt || !st) return;
    const count = visitTypeCounts[visitType] || 0;
    const mult = 1 / (count + 1); // 1st use=full, 2nd=½, 3rd=⅓, etc.
    const ns = { ...stats };
    const b = { ...stBon };
    b[visitState] = Math.min(0.10, (b[visitState] || 0) + 0.015 * mult);
    if (vt.approvalBoost) ns.approvalRating += vt.approvalBoost * mult;
    const visitNF = { ...cg.factions };
    if (vt.factionEffects) {
      Object.entries(vt.factionEffects).forEach(([fid, v]) => {
        if (visitNF[fid]) visitNF[fid] = { ...visitNF[fid], relationship: Math.max(5, Math.min(95, visitNF[fid].relationship + v * 6 * mult)) };
      });
    }
    if (vt.partyUnityBoost) {
      const allyIds = ALLIED_FACTIONS[pp] || [];
      const clampU = v => Math.max(20, Math.min(95, v));
      allyIds.forEach(fid => { if (visitNF[fid]) visitNF[fid] = { ...visitNF[fid], unity: clampU(visitNF[fid].unity + vt.partyUnityBoost * mult) }; });
    }
    setCG({ ...cg, factions: visitNF });
    if (vt.effects) {
      Object.entries(vt.effects).forEach(([type, w]) => {
        STATE_DATA.forEach(s => { if (s[type] && s[type] > 0.1) b[s.abbr] = (b[s.abbr] || 0) + w * 0.3 * mult; });
      });
    }
    if (vt.educationEffect) {
      STATE_DATA.forEach(s => {
        b[s.abbr] = (b[s.abbr] || 0) + s.education * vt.educationEffect.nationwide * mult;
        if (s.abbr === visitState) b[s.abbr] += s.education * vt.educationEffect.local * mult;
      });
    }
    if (vt.urbanEffect) {
      STATE_DATA.forEach(s => {
        b[s.abbr] = (b[s.abbr] || 0) + s.urbanization * vt.urbanEffect.nationwide * mult;
        if (s.abbr === visitState) b[s.abbr] += s.urbanization * vt.urbanEffect.local * mult;
      });
    }
    if (vt.ruralEffect) {
      STATE_DATA.forEach(s => {
        const rural = 1 - (s.urbanization || 0.7);
        b[s.abbr] = (b[s.abbr] || 0) + rural * vt.ruralEffect.nationwide * mult;
        if (s.abbr === visitState) b[s.abbr] += rural * vt.ruralEffect.local * mult;
      });
    }
    if (vt.religiosityEffect) {
      STATE_DATA.forEach(s => {
        const rel = s.religiosity || 0.5;
        b[s.abbr] = (b[s.abbr] || 0) + rel * vt.religiosityEffect.nationwide * mult;
        if (s.abbr === visitState) b[s.abbr] += rel * vt.religiosityEffect.local * mult;
        if (vt.religiosityEffect.antiNationwide) b[s.abbr] += (1 - rel) * vt.religiosityEffect.antiNationwide * mult;
        if (s.abbr === visitState && vt.religiosityEffect.antiLocal) b[s.abbr] += (1 - rel) * vt.religiosityEffect.antiLocal * mult;
      });
    }
    setStBon(b);
    setStats(syncDerivedStats(ns, macroState));
    setAct(n => n + 1);
    setVisitTypeCounts(prev => ({ ...prev, [visitType]: (prev[visitType] || 0) + 1 }));
    if (campaignSeasonStarted) setCampaignActivity(n => n + 1);
    addLog(`Visited ${st.name}: ${vt.name}${count > 0 ? ` (${Math.round(mult * 100)}% effectiveness)` : ""}`);
    setVisitState("");
    setVisitType("");
  };

  const issueEO = (eo, extraData = {}) => {
    if (act + 2 > maxActions) return;
    const lastIssued = activeOrders
      .filter(order => order.id === eo.id)
      .sort((a, b) => b.issuedWeek - a.issuedWeek)[0];
    if (eo.repeatable && lastIssued && week < lastIssued.issuedWeek + 52) return;
    const count = eoIssuedCount[eo.id] || 0;
    const mult = eo.repeatable ? Math.max(0.3, 1 / (1 + count * 0.5)) : 1;
    const outcome = buildExecutiveOrderOutcome(eo, extraData);

    // Immediate stat effects
    let ns = { ...stats };
    let nextMacroState = { ...macroState, impulses: { ...macroState.impulses } };
    ({ stats: ns, macroState: nextMacroState } = applyEffectsBundle(ns, nextMacroState, outcome.effects || {}, outcome, mult));

    // Delayed effects via pFx queue
    if (outcome.delayedEffects) {
      const de = Object.fromEntries(Object.entries(outcome.delayedEffects.effects).map(([k, v]) => [k, v * mult]));
      setPFx(p => [...p, {
        week: week + outcome.delayedEffects.weeks,
        name: eo.name + " (delayed)",
        effects: de,
        macroEffects: Object.fromEntries(Object.entries(outcome.delayedMacroEffects?.effects || {}).map(([k, v]) => [k, v * mult])),
      }]);
    } else if (outcome.delayedMacroEffects) {
      setPFx(p => [...p, {
        week: week + outcome.delayedMacroEffects.weeks,
        name: eo.name + " (delayed)",
        effects: {},
        macroEffects: Object.fromEntries(Object.entries(outcome.delayedMacroEffects.effects || {}).map(([k, v]) => [k, v * mult])),
      }]);
    }

    // Faction reactions
    const oppositionIds = OPPOSITION_FACTIONS[pp] || [];
    const reactions = outcome.factionReactions;
    const controversyPenalty = eo.controversy * -6;
    const nf = { ...cg.factions };
    Object.entries(reactions).forEach(([fid, v]) => {
      if (nf[fid]) nf[fid] = { ...nf[fid], relationship: Math.max(5, Math.min(95, nf[fid].relationship + v * 8 * mult)) };
    });
    // Always penalise opposition (overreach), scaled by controversy
    oppositionIds.forEach(fid => {
      if (nf[fid] && (reactions[fid] == null || reactions[fid] >= 0)) {
        nf[fid] = { ...nf[fid], relationship: Math.max(5, Math.min(95, nf[fid].relationship + controversyPenalty)) };
      }
    });
    setCG({ ...cg, factions: nf });

    // State approval effects
    if (outcome.stateEffects) {
      const b = { ...stBon };
      const se = outcome.stateEffects;
      STATE_DATA.forEach(s => {
        let hit = false;
        if (se.border && s.border) hit = true;
        if (se.economy && se.economy.includes(s.economy)) hit = true;
        if (se.region && se.region.includes(s.region)) hit = true;
        if (se.minEducation && s.education >= se.minEducation) hit = true;
        if (se.minUrbanization && s.urbanization >= se.minUrbanization) hit = true;
        if (se.stateAbbrs && se.stateAbbrs.includes(s.abbr)) hit = true;
        if (se.drillingRegions?.length) {
          const drillingHit = se.drillingRegions.some(regionId => {
            const targets = DRILLING_REGION_STATE_MAP[regionId] || [];
            return targets.includes(s.abbr) && s.economy === "energy";
          });
          if (drillingHit) hit = true;
        }
        if (hit) b[s.abbr] = (b[s.abbr] || 0) + se.weight * mult;
      });
      setStBon(b);
    }

    // Country effects for tariffs (hit all trading partners)
    if (eo.countryEffect?.targetAll) {
      setCountries(p => p.map(c => {
        const nc = { ...c, relationship: Math.max(0, Math.min(100, c.relationship + eo.countryEffect.relationship * mult)) };
        nc.status = nc.relationship >= 70 ? "ALLIED" : nc.relationship >= 50 ? "FRIENDLY" : nc.relationship >= 30 ? "NEUTRAL" : nc.relationship >= 15 ? "UNFRIENDLY" : "HOSTILE";
        return nc;
      }));
    }
    // Tariffs hurt international engagement
    if (eo.id === 'tariffs') setEngagement(e => Math.max(0, e - 10));

    // Sanctions: hit targeted country hard
    if (eo.choiceType === "country" && extraData.targetCountryId) {
      setCountries(p => p.map(c => {
        if (c.id !== extraData.targetCountryId) return c;
        const nc = { ...c, relationship: Math.max(0, c.relationship - 18), trust: Math.max(0, c.trust - 12) };
        nc.status = nc.relationship >= 70 ? "ALLIED" : nc.relationship >= 50 ? "FRIENDLY" : nc.relationship >= 30 ? "NEUTRAL" : nc.relationship >= 15 ? "UNFRIENDLY" : "HOSTILE";
        return nc;
      }));
      if (extraData.targetCountryId === "china") {
        nextMacroState = applyMacroEffects(nextMacroState, { investment: -0.04, nx: -0.03, confidence: -0.02 });
        ns = syncDerivedStats(ns, nextMacroState);
      }
    }

    setStats(syncDerivedStats(ns, nextMacroState));
    setMacroState(nextMacroState);
    if (eo.id === "executive_office_optimization") setMaxActions(5);

    // Record it
    setActiveOrders(prev => [...prev, { id: eo.id, name: eo.name, issuedWeek: week, active: true, choiceData: extraData }]);
    setEoIssuedCount(prev => ({ ...prev, [eo.id]: count + 1 }));
    setPassedLegislation(prev => ({ ...prev, [eo.id]: week }));
    const overreachIncrease = eo.controversy === 0 ? 0 : 3 + 5 * eo.controversy;
    const nextOverreach = Math.min(100, executiveOverreach + overreachIncrease);
    setExecutiveOverreach(nextOverreach);
    setOverreachLastIncreasedWeek(week);
    setOverreachLowSinceWeek(nextOverreach <= 31 ? week : 0);
    setAct(n => n + 2);
    setSelectedEO(null);
    setEoChoice({});
    addLog(`EXECUTIVE ORDER: "${eo.name}" signed.${outcome.delayedEffects || outcome.delayedMacroEffects ? ` Effects delayed ${(outcome.delayedEffects?.weeks || outcome.delayedMacroEffects?.weeks)} weeks.` : ""}`);

    // Build result payload
    const factionLines = Object.entries(reactions).map(([fid, v]) => {
      const f = nf[fid]; const actual = Math.round(v * 8 * mult);
      return f && actual !== 0 ? { name: f.name, val: actual } : null;
    }).filter(Boolean);
    const oppLines = oppositionIds.filter(fid => reactions[fid] == null || reactions[fid] >= 0).map(fid => {
      const f = nf[fid]; return f ? { name: f.name, val: Math.round(controversyPenalty) } : null;
    }).filter(Boolean);
    setEoResult({
      eo: {
        ...eo,
        effects: outcome.effects,
        delayedEffects: outcome.delayedEffects,
        macroEffects: outcome.macroEffects,
        delayedMacroEffects: outcome.delayedMacroEffects,
      },
      mult,
      factionLines: [...factionLines, ...oppLines.filter(ol => !factionLines.find(fl => fl.name === ol.name))],
      extraData,
    });
  };

  const clampRel = v => Math.max(5, Math.min(95, v));
  const clampUni = v => Math.max(20, Math.min(95, v));

  const signBill = () => {
    if (!pendingSignature) return;
    const { act, votes, isBudget, budgetDraft } = pendingSignature;

    // Apply stat effects
    if (isBudget) {
      const BUDGET_KEYS = ["corporateTaxRate","incomeTaxLow","incomeTaxMid","incomeTaxHigh","payrollTaxRate","militarySpending","educationSpending","healthcareSpending","socialSecuritySpending","infrastructureSpending","otherSpending"];
      const ns = { ...stats };
      BUDGET_KEYS.forEach(k => { if (budgetDraft[k] != null) ns[k] = stats[k] * (1 + budgetDraft[k]); });
      ns.approvalRating = (ns.approvalRating || 50) + 1.5;
      setStats(syncDerivedStats(ns, macroState));
      setReconciliationCooldown(week + 52);
    } else {
      let ns = { ...stats };
      let nextMacroState = { ...macroState, impulses: { ...macroState.impulses } };
      ({ stats: ns, macroState: nextMacroState } = applyEffectsBundle(
        ns,
        nextMacroState,
        Object.fromEntries(Object.entries(act.effects).filter(([k]) => !["crimeRate"].includes(k))),
        act
      ));
      ns.approvalRating = (ns.approvalRating || 50) + 1.5;
      setStats(syncDerivedStats(ns, nextMacroState));
      setMacroState(nextMacroState);
      // Delayed effects
      if (act.delayedEffects || act.delayedMacroEffects) {
        setPFx(p => [...p, {
          name: act.name,
          effects: act.delayedEffects?.effects || {},
          macroEffects: act.delayedMacroEffects?.effects || {},
          week: week + (act.delayedEffects?.weeks || act.delayedMacroEffects?.weeks || 9),
        }]);
      }
      Object.entries(act.effects).forEach(([k, val]) => {
        if (["crimeRate"].includes(k)) {
          setPFx(p => [...p, { name: act.name, effects: { [k]: val }, macroEffects: {}, week: week + 9 }]);
        }
      });
      applyStateEffects(act);
      if (act.engagementEffect) setEngagement(e => Math.max(0, Math.min(50, e + act.engagementEffect)));
      if (act.powerProjectionEffect) setPowerProjection(p => Math.max(0, Math.min(50, p + act.powerProjectionEffect)));
      if (act.countryEffects) {
        setCountries(prev => prev.map(c => {
          const eff = act.countryEffects[c.id];
          if (!eff) return c;
          const nc = { ...c };
          if (eff.relationship) nc.relationship = Math.max(0, Math.min(100, nc.relationship + eff.relationship));
          if (eff.trust) nc.trust = Math.max(0, Math.min(100, nc.trust + eff.trust));
          nc.status = nc.relationship >= 70 ? "ALLIED" : nc.relationship >= 50 ? "FRIENDLY" : nc.relationship >= 30 ? "NEUTRAL" : nc.relationship >= 15 ? "UNFRIENDLY" : "HOSTILE";
          return nc;
        }));
      }
    }

    // Apply faction effects and unity craters
    setCG(prev => {
      const nf = { ...prev.factions };
      if (isBudget) {
        Object.entries(act.factionReactions).forEach(([fid, v]) => {
          if (nf[fid]) nf[fid] = { ...nf[fid], relationship: clampRel(nf[fid].relationship + v * 6) };
        });
      }
      const allyIds = ALLIED_FACTIONS[pp] || [];
      const allyOpposers = allyIds.filter(fid => (act.factionReactions[fid] || 0) < -0.2);
      if (allyOpposers.length >= 3) {
        allyIds.forEach(fid => {
          if (nf[fid]) nf[fid] = { ...nf[fid], unity: clampUni(nf[fid].unity - 15), relationship: clampRel(nf[fid].relationship - 12) };
        });
        addLog(`Your party's three factions strongly opposed ${act.name}. Party unity collapses.`);
      } else if (allyOpposers.length === 2) {
        allyOpposers.forEach(fid => {
          if (nf[fid]) nf[fid] = { ...nf[fid], unity: clampUni(nf[fid].unity - 10), relationship: clampRel(nf[fid].relationship - 7) };
        });
        addLog(`Two party factions strongly opposed ${act.name}. Unity damaged.`);
      } else if (allyOpposers.length === 1) {
        allyOpposers.forEach(fid => {
          if (nf[fid]) nf[fid] = { ...nf[fid], unity: clampUni(nf[fid].unity - 5), relationship: clampRel(nf[fid].relationship - 3) };
        });
      }
      return { ...prev, factions: nf };
    });

    const locks = BILL_LOCKS[act.id] || [];
    if (locks.length > 0) setLockedBills(p => new Set([...p, ...locks]));

    const billAmends = (appliedAmendments[act.id] || []).map(id =>
      (BILL_AMENDMENTS[act.id] || []).find(a => a.id === id)
    ).filter(Boolean);

    setBillRecord(r => [...r, {
      name: act.name, week, passed: true,
      senateYes: votes.senateYes, senateNo: votes.senateNo,
      houseYes: votes.houseYes, houseNo: votes.houseNo,
      amendments: billAmends,
    }]);
    setPassedLegislation(prev => ({ ...prev, [act.id]: week }));
    const nextOverreach = Math.max(0, executiveOverreach - 3);
    setExecutiveOverreach(nextOverreach);
    setOverreachLowSinceWeek(nextOverreach <= 31 ? (overreachLowSinceWeek || week) : 0);
    if (act.id === 'defense_mod') setPowerProjection(p => Math.min(50, p + 5));
    addLog(`${act.name} SIGNED INTO LAW by President ${pn}`);
    setPendingSignature(null);
  };

  const vetoBill = () => {
    if (!pendingSignature) return;
    const { act, votes, isBudget } = pendingSignature;

    // Veto faction effects: big rel hit for supporters, boost for opposers
    setCG(prev => {
      const nf = { ...prev.factions };
      Object.entries(act.factionReactions).forEach(([fid, reaction]) => {
        if (!nf[fid]) return;
        if (reaction > 0.2) {
          // Supported the bill — upset by veto
          nf[fid] = { ...nf[fid], relationship: clampRel(nf[fid].relationship - 15), unity: clampUni(nf[fid].unity - 8) };
        } else if (reaction < -0.2) {
          // Opposed the bill — pleased by veto
          nf[fid] = { ...nf[fid], relationship: clampRel(nf[fid].relationship + 10), unity: clampUni(nf[fid].unity + 5) };
        }
      });
      return { ...prev, factions: nf };
    });

    setStats(syncDerivedStats({ ...stats, approvalRating: clampRel(stats.approvalRating - 2) }, macroState));

    // Allow re-introduction after cooldown
    if (isBudget) {
      setReconciliationCooldown(week + 8);
      setUsedPol(p => { const np = new Set(p); np.delete("budget_reconciliation"); return np; });
    } else {
      setUsedPol(p => { const np = new Set(p); np.delete(act.id); return np; });
      setBillCooldowns(c => ({ ...c, [act.id]: week + 8 }));
    }

    const billAmends = (appliedAmendments[act.id] || []).map(id =>
      (BILL_AMENDMENTS[act.id] || []).find(a => a.id === id)
    ).filter(Boolean);

    setBillRecord(r => [...r, {
      name: act.name, week, passed: false, vetoed: true,
      senateYes: votes.senateYes, senateNo: votes.senateNo,
      houseYes: votes.houseYes, houseNo: votes.houseNo,
      amendments: billAmends,
    }]);
    addLog(`${act.name} VETOED by President ${pn}`);
    setPendingSignature(null);
  };

  const acceptAmendment = (amendment) => {
    if (!activeBill) return;
    setActiveBill(b => {
      if (!b) return b;
      const newReactions = { ...b.act.factionReactions };
      Object.entries(amendment.factionMod).forEach(([fid, delta]) => {
        newReactions[fid] = Math.max(-1, Math.min(1, (newReactions[fid] ?? -0.35) + delta));
      });
      return { ...b, act: { ...b.act, factionReactions: newReactions } };
    });
    setAppliedAmendments(prev => ({
      ...prev,
      [activeBill.act.id]: [...(prev[activeBill.act.id] || []), amendment.id],
    }));
    addLog(`Amendment accepted: "${amendment.label}" added to ${activeBill.act.name}.`);
    const nextOverreach = Math.max(0, executiveOverreach - 2);
    setExecutiveOverreach(nextOverreach);
    setOverreachLowSinceWeek(nextOverreach <= 31 ? (overreachLowSinceWeek || week) : 0);
    setPendingNegotiation(null);
  };

  const walkAwayNegotiation = () => {
    if (!pendingNegotiation) return;
    if (pendingNegotiation.eligibleFactionIds?.length > 0) {
      const fid = pendingNegotiation.eligibleFactionIds[0];
      setCG(prev => {
        const nf = { ...prev.factions };
        if (nf[fid]) nf[fid] = { ...nf[fid], trust: Math.max(5, nf[fid].trust - 5) };
        return { ...prev, factions: nf };
      });
      addLog(`Walked away from negotiations — trust decreased.`);
    }
    const nextOverreach = Math.min(100, executiveOverreach + 5);
    setExecutiveOverreach(nextOverreach);
    setOverreachLastIncreasedWeek(week);
    setOverreachLowSinceWeek(nextOverreach <= 31 ? week : 0);
    setPendingNegotiation(null);
  };

  const rescindEO = (orderId) => {
    const eo = EXECUTIVE_ORDERS.find(e => e.id === orderId);
    const activeOrder = activeOrders.find(o => o.id === orderId && o.active);
    if (!eo || !eo.reversible || !activeOrder) return;
    if (week < activeOrder.issuedWeek + 12) return;
    const outcome = buildExecutiveOrderOutcome(eo, activeOrder.choiceData || {});
    setActiveOrders(prev => prev.map(o => o === activeOrder ? { ...o, active: false } : o));
    // Political cost: allies annoyed at flip-flopping
    const allyIds = ALLIED_FACTIONS[pp] || [];
    const nf = { ...cg.factions };
    allyIds.forEach(fid => { if (nf[fid]) nf[fid] = { ...nf[fid], relationship: Math.max(5, nf[fid].relationship - 8) }; });
    Object.entries(outcome?.factionReactions || {}).forEach(([fid, reaction]) => {
      if (!nf[fid] || reaction <= 0) return;
      nf[fid] = {
        ...nf[fid],
        trust: Math.max(5, nf[fid].trust - 10),
        relationship: Math.max(5, nf[fid].relationship - 4),
      };
    });
    setCG({ ...cg, factions: nf });
    const nextOverreach = Math.max(0, executiveOverreach - 5);
    setExecutiveOverreach(nextOverreach);
    setOverreachLowSinceWeek(nextOverreach <= 31 ? (overreachLowSinceWeek || week) : 0);
    addLog(`EXECUTIVE ORDER RESCINDED: "${eo.name}"`);
  };

  const doSpeech = pos => {
    if (act >= maxActions) return;
    const ns = { ...stats };
    if (pos.approvalSwing) ns.approvalRating += pos.approvalSwing;
    const allyIds = ALLIED_FACTIONS[pp] || [];
    const allyNet = allyIds.reduce((sum, fid) => sum + (pos.factionEffects?.[fid] || 0), 0);
    const nf = { ...cg.factions };
    if (pos.factionEffects) {
      Object.entries(pos.factionEffects).forEach(([fid, v]) => {
        if (nf[fid]) nf[fid] = {
          ...nf[fid],
          relationship: Math.max(5, Math.min(95, nf[fid].relationship + v * 6)),
          trust: Math.max(5, Math.min(95, nf[fid].trust + v * 2)),
        };
      });
    }
    // Party unity effect based on speech alignment
    const clampU = v => Math.max(20, Math.min(95, v));
    if (allyNet > 0.3) {
      allyIds.forEach(fid => { if (nf[fid]) nf[fid] = { ...nf[fid], unity: clampU(nf[fid].unity + 2) }; });
    } else if (allyNet < -0.3) {
      allyIds.forEach(fid => { if (nf[fid]) nf[fid] = { ...nf[fid], unity: clampU(nf[fid].unity - 2) }; });
    }
    setCG({ ...cg, factions: nf });
    setStats(syncDerivedStats(ns, macroState));
    setAct(n => n + 1);
    if (campaignSeasonStarted) setCampaignActivity(n => n + 1);
    const topicName = SPEECH_TOPICS.find(t => t.id === speechTopic)?.name ?? speechTopic;
    addLog(`Speech on ${topicName}: "${pos.label}"`);
    setSpeechTopic(null);
    setSpeechPreview(null);
  };

  const submitBudget = () => {
    if (!budgetDraft || activeBill) return;
    const reactions = computeBudgetReactions(budgetDraft);
    const syntheticBill = {
      id: "budget_reconciliation",
      name: "Budget Reconciliation Act",
      desc: "Custom budget adjustments",
      category: "fiscal",
      factionReactions: reactions,
      effects: {},
    };
    setActiveBill({ act: syntheticBill, stage: "committee", fails: 0, turnsInStage: 0, consecutiveFails: 0, isBudget: true, budgetDraft: { ...budgetDraft } });
    setUsedPol(p => new Set([...p, "budget_reconciliation"]));
    setShowBudget(false);
    setBudgetDraft(null);
    addLog(`Budget Reconciliation Act introduced — entering committee`);
  };

  /* ── SCREENS ── */

  if (screen === 0) return <LandingScreen onStart={() => setScreen(1)} />;

  if (screen === 1) return (
    <SetupScreen pp={pp} setPP={setPP} pf={pf} setPF={setPF} pn={pn} setPN={setPN} vpn={vpn} setVpn={setVpn} onStart={start} />
  );

  if (!cg) return null;

  const allF = Object.values(cg.factions);
  const allyF = allF.filter(f => f.party === cg.pp);
  const oppoF = allF.filter(f => f.party !== cg.pp);

  return (
    <div style={{ padding: "0.75rem", fontSize: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Wk {wiy}, Year {yr} · {season}</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>President {pn}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Approval</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: natA > 50 ? "#1D9E75" : natA > 38 ? "#EF9F27" : "#E24B4A" }}>{Math.round(natA)}%</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Actions</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: act >= maxActions ? "#E24B4A" : act >= maxActions - 1 ? "#EF9F27" : "#1D9E75" }}>{maxActions - act}<span style={{ fontSize: 10, fontWeight: 400, color: "var(--color-text-secondary)" }}>/{maxActions}</span></div>
          </div>
          {activeBill && <Badge color="#378ADD">Bill in Congress</Badge>}
          <button onClick={advance} style={{ padding: "7px 14px", fontSize: 12, fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Next week</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 1, marginBottom: 10, overflowX: "auto", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "3px 9px", fontSize: 11, fontWeight: tab === t ? 500 : 400,
            background: tab === t ? "var(--color-background-secondary)" : "transparent",
            color: tab === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
            textTransform: "capitalize", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>


      {/* Notification bar */}
      {(() => {
        const derived = [];
        if (pendingNegotiation && activeBill && tab !== "policy") {
          derived.push({
            id: "negotiation",
            type: "negotiation",
            message: `Negotiation opportunity: amendments available for ${activeBill.act.name}.`,
            tab: "policy",
          });
        }
        const all = [...derived, ...notifications];
        return all.length > 0 ? (
          <NotificationBar
            notifications={all}
            onDismiss={dismissNotification}
            onTabSwitch={setTab}
          />
        ) : null;
      })()}

      {tab === "overview" && (
        <OverviewTab
          stats={stats} prev={prev} hist={hist}
          macroState={macroState}
          sA={sA} stateHist={stateHist}
          hov={hov} setHov={setHov}
          activeBill={activeBill} billLikelihood={billLikelihood}
          week={week}
        />
      )}

      {tab === "congress" && (
        <CongressTab
          allF={allF} allyF={allyF} oppoF={oppoF} pf={pf}
          congressTab={congressTab} setCongressTab={setCongressTab}
          hovFaction={hovFaction} setHovFaction={setHovFaction}
          billRecord={billRecord}
          executiveOverreach={executiveOverreach}
          congressHistory={congressHistory}
          confirmationHistory={confirmationHistory}
          factionHist={factionHist}
        />
      )}

      {tab === "party" && (
        <PartyTab
          allF={allF} allyF={allyF} cg={cg} pf={pf}
          factionHist={factionHist}
          promises={promises} promiseOffers={promiseOffers} passedLegislation={passedLegislation} week={week}
          surrogates={surrogates} surrogateUI={surrogateUI} setSurrogateUI={setSurrogateUI}
          coachCooldown={coachCooldown}
          countries={countries} visitedCountries={visitedCountries}
          act={act} maxActions={maxActions}
          onMakePromise={makePromise} onAssignSurrogate={assignSurrogate}
          campaignMetrics={campaignMetrics}
        />
      )}

      {tab === "cabinet" && (
        <CabinetTab
          pn={pn}
          vpn={vpn}
          pp={pp}
          pf={pf}
          week={week}
          macroState={macroState}
          cabinet={cabinet}
          act={act}
          maxActions={maxActions}
          pendingAppointment={pendingAppointment}
          surrogates={surrogates}
          onStartSecStateSelection={beginSecStateAppointment}
          onSelectSecStateCandidate={selectSecStateCandidate}
          onNominateSecStateCandidate={nominateSecStateCandidate}
          onLobbyAppointment={lobbyAppointment}
          onFastTrackAppointment={fastTrackAppointment}
        />
      )}

      {tab === "policy" && (
        <PolicyTab
          activeBill={activeBill} billLikelihood={billLikelihood} billFactionVotes={billFactionVotes}
          pendingNegotiation={pendingNegotiation}
          act={act} maxActions={maxActions} week={week}
          reconciliationCooldown={reconciliationCooldown}
          policyFilter={policyFilter} setPolicyFilter={setPolicyFilter}
          lockedBills={lockedBills} billCooldowns={billCooldowns} usedPol={usedPol}
          cg={cg}
          onOpenBudget={() => {
            if (!activeBill && (reconciliationCooldown === 0 || week >= reconciliationCooldown)) {
              setBudgetDraft({ corporateTaxRate: 0, incomeTaxLow: 0, incomeTaxMid: 0, incomeTaxHigh: 0, payrollTaxRate: 0, militarySpending: 0, educationSpending: 0, healthcareSpending: 0, socialSecuritySpending: 0, infrastructureSpending: 0, otherSpending: 0 });
              setShowBudget(true);
            }
          }}
          onPropose={propose}
          onWalkAway={walkAwayNegotiation}
          onAcceptAmendment={acceptAmendment}
        />
      )}

      {tab === "actions" && (
        <ActionsTab
          act={act} maxActions={maxActions} week={week}
          actionsSubTab={actionsSubTab} setActionsSubTab={setActionsSubTab}
          selectedEO={selectedEO} setSelectedEO={setSelectedEO}
          eoChoice={eoChoice} setEoChoice={setEoChoice}
          eoIssuedCount={eoIssuedCount} activeOrders={activeOrders}
          executiveOverreach={executiveOverreach}
          pp={pp} cg={cg}
          countries={countries} visitedCountries={visitedCountries}
          recentDisasters={recentDisasters}
          visitState={visitState} setVisitState={setVisitState}
          visitType={visitType} setVisitType={setVisitType}
          visitTypeCounts={visitTypeCounts}
          speechTopic={speechTopic} setSpeechTopic={setSpeechTopic}
          speechPreview={speechPreview} setSpeechPreview={setSpeechPreview}
          sA={sA}
          onIssueEO={issueEO} onRescindEO={rescindEO}
          onDoVisit={doVisit} onDoSpeech={doSpeech}
        />
      )}

      {tab === "diplomacy" && (
        <DiplomacyTab
          countries={countries} visitedCountries={visitedCountries}
          act={act} maxActions={maxActions} week={week}
          factions={cg.factions}
          onForeignVisit={doForeignVisit}
          engagement={engagement}
          powerProjection={powerProjection}
          globalTension={globalTension}
        />
      )}

      {tab === "log" && <LogTab log={log} />}

      {/* Modals */}
      <BudgetModal
        budgetDraft={showBudget ? budgetDraft : null}
        stats={stats} macroState={macroState} factions={cg.factions}
        onChangeDraft={(key, val) => setBudgetDraft(p => ({ ...p, [key]: val }))}
        onSubmit={submitBudget}
        onCancel={() => { setShowBudget(false); setBudgetDraft(null); }}
      />
      <EoResultModal eoResult={eoResult} pn={pn} week={week} onDismiss={() => setEoResult(null)} />
      <SignBillModal
        pendingSignature={pendingSignature}
        appliedAmendments={appliedAmendments}
        factions={cg.factions}
        pn={pn} week={week}
        onSign={signBill} onVeto={vetoBill}
      />
      <BrokenPromiseModal brokenPromises={brokenPromises} onDismiss={() => setBrokenPromises(q => q.slice(1))} />
      <ForeignVisitModal result={foreignVisitResult} onDismiss={() => setForeignVisitResult(null)} />
      <PromiseModal
        pendingPromise={pendingPromise}
        factions={cg.factions}
        week={week}
        onConfirm={confirmPromise}
        onCancel={() => setPendingPromise(null)}
      />
      <MidtermModal
        results={showMidtermModal ? midtermResults : null}
        onDismiss={() => setShowMidtermModal(false)}
      />
      <InaugurationModal
        results={showInaugurationModal ? midtermResults : null}
        onDismiss={() => setShowInaugurationModal(false)}
      />
      <CrisisModal curEv={curEv} wiy={wiy} yr={yr} onChoice={handleEventChoice} />
    </div>
  );
}
