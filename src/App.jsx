import { useState, useCallback, useEffect, useMemo, useRef } from "react";

import { PARTIES, FACTION_DATA } from "./data/factions.js";
import { STATE_DATA } from "./data/states.js";
import { COUNTRIES_INIT } from "./data/countries.js";
import { INITIAL_STATS } from "./data/stats.js";
import { VISIT_TYPES } from "./data/visits.js";
import { SPEECH_TOPICS } from "./data/speeches.js";
import { POLICY_ACTIONS, BILL_LOCKS, BILL_AMENDMENTS } from "./data/policies.js";
import {
  CHINA_SANCTIONS_RETALIATION_EVENT,
  PROGRESSIVE_HECKLER_EVENT,
  getSeasonLabel,
  shouldTriggerProgressiveHeckling,
} from "./data/events.js";
import {
  EXECUTIVE_ORDERS,
  buildExecutiveOrderOutcome,
  isExecutiveOrderVisible,
} from "./data/executiveOrders.js";
import { TABS, ALLIED_FACTIONS, OPPOSITION_FACTIONS, COUNTRY_FACTION_EFFECTS } from "./data/constants.js";

import { generateCongress } from "./logic/generateCongress.js";
import {
  resolveBillProposal,
  resolveEventChoice,
  resolveExecutiveOrder,
  resolveForeignVisit,
  resolvePromiseConfirmation,
  resolveSignedBill,
  resolveSpeech,
  resolveVetoedBill,
} from "./logic/actionResolution.js";
import { calcStateApproval } from "./logic/calcStateApproval.js";
import { advanceApproval } from "./logic/approvalCalc.js";
import { calcStageAdvance } from "./logic/billProgression.js";
import { syncDerivedStats } from "./logic/effectResolution.js";
import {
  advanceMacroEconomy,
  buildFedNominationEvent,
  createInitialMacroState,
  pickFedChairName,
  resolveFedNomination,
} from "./logic/macroEconomy.js";
import { generateSecStateCandidates } from "./logic/cabinetAppointments.js";
import { APPOINTMENT_STAGES, evaluateAppointment } from "./logic/appointmentProgression.js";
import {
  generateInitialJustices,
  ageJustices,
  checkJusticeVacancy,
  generateScotusJusticeCandidates,
  buildScotusAppointmentProcess,
} from "./logic/scotusAppointments.js";
import { settleSecStatePromises } from "./logic/promiseResolution.js";
import { runWeeklySimulation } from "./logic/weeklySimulation.js";
import { computeBudgetReactions } from "./systems/budgetCalc.js";
import { makeSurrogates } from "./utils/makeSurrogates.js";
import { createNameRegistry } from "./utils/nameBank.js";
import { countryStatus } from "./utils/countryStatus.js";

import Badge from "./components/Badge.jsx";

import LandingScreen from "./components/screens/LandingScreen.jsx";
import SetupScreen from "./components/screens/SetupScreen.jsx";
import CrisisModal from "./components/modals/CrisisModal.jsx";

import OverviewTab from "./components/tabs/OverviewTab.jsx";
import CongressTab from "./components/tabs/CongressTab.jsx";
import PartyTab from "./components/tabs/PartyTab.jsx";
import CabinetTab from "./components/tabs/CabinetTab.jsx";
import JudiciaryTab from "./components/tabs/JudiciaryTab.jsx";
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

const DRILLING_REGION_STATE_MAP = {
  gulf: ["TX", "LA"],
  bering: ["AK"],
  atlantic: ["WV", "KY"],
  pacific: ["NM", "WY"],
};

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
  const [difficulty, setDifficulty] = useState("normal");
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

  // ── SCOTUS state ──────────────────────────────────────────────────────────
  const [scotusJustices, setScotusJustices] = useState([]); // [{id, name, age, timeServed, party, ideology, isChief}]
  const [scotusVacancy, setScotusVacancy] = useState(null);  // { justiceId, isChief, stage:"selecting"|"confirming", candidates, selectedId, vetMoreUsed }
  const [scotusPendingConfirmation, setScotusConfirmation] = useState(null); // appointment-like object
  const [pendingScotusEvent, setPendingScotusEvent] = useState(null); // queued crisis event for when curEv clears

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
    queueMicrotask(() => {
      setDiscoveredHiddenOrders(prev => [...prev, ...newlyVisible.map(order => order.id)]);
      newlyVisible.forEach((order) => {
        addNotification({
          type: "eo_unlock",
          message: `New executive order available: ${order.name}.`,
          tab: "actions",
        });
      });
    });
  }, [addNotification, discoveredHiddenOrders, week]);

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
        const settled = settleSecStatePromises(promises, finalFactions, result.secStateConfirmed.factionId, result.secStateConfirmed.name);
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
  }, [addLog, addNotification, cabinet, cg, macroState, pendingAppointment, promises, refreshPromiseOffers, resolveAppointmentStep, week]);

  const lobbyAppointment = useCallback(() => {
    if (!pendingAppointment || pendingAppointment.officeId !== "sec_state") return;

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

  // ── SCOTUS actions ───────────────────────────────────────────────────────

  const selectScotusCandidate = (candidateId) => {
    setScotusVacancy(prev => prev ? { ...prev, selectedId: prev.selectedId === candidateId ? null : candidateId } : prev);
  };

  const vetMoreScotus = () => {
    if (!scotusVacancy || scotusVacancy.vetMoreUsed) return;
    const moreCandidates = generateScotusJusticeCandidates(pp, nameRegistryRef.current);
    setScotusVacancy(prev => prev ? {
      ...prev,
      candidates: [...prev.candidates, ...moreCandidates],
      vetMoreUsed: true,
    } : prev);
  };

  const nominateScotusCandidate = () => {
    if (!scotusVacancy || !scotusVacancy.selectedId) return;
    const candidate = scotusVacancy.candidates.find(c => c.id === scotusVacancy.selectedId);
    if (!candidate) return;
    const process = buildScotusAppointmentProcess(candidate);
    process.isChief = scotusVacancy.isChief;
    process.justiceId = scotusVacancy.justiceId;
    setScotusConfirmation(process);
    setScotusVacancy(prev => prev ? { ...prev, stage: "confirming", selectedId: null } : prev);
    addLog(`${candidate.name} nominated for Supreme Court.`);
  };

  const lobbyScotus = () => {
    if (!scotusPendingConfirmation) return;
    if (scotusPendingConfirmation.lobbyUsedStage === scotusPendingConfirmation.stage) return;
    const success = Math.random() < 0.66;
    const boosted = Object.fromEntries(
      Object.entries(scotusPendingConfirmation.factionReactions || {}).map(([fid, r]) => [
        fid, Math.max(-0.95, Math.min(0.95, r + (success ? 0.04 : 0))),
      ])
    );
    const vote = evaluateAppointment({ ...cg, factions: cg.factions }, boosted);
    setScotusConfirmation(prev => prev ? ({
      ...prev,
      factionReactions: boosted,
      factionVotes: vote.factionVotes,
      passLikelihood: vote.passLikelihood,
      lobbyUsedStage: prev.stage,
    }) : prev);
    addLog(`${surrogates.find(s => s.id === "s1")?.name || "Senior Advisor"} ${success ? "improved" : "failed to improve"} Senate sentiment for ${scotusPendingConfirmation.nomineeName}.`);
  };

  const start = () => {
    if (!pp || !pf || !pn.trim()) return;
    nameRegistryRef.current = createNameRegistry();
    const freshFedChairName = nameRegistryRef.current.drawName("Fed Chair");
    const c = generateCongress(pp, pf, nameRegistryRef.current, difficulty);
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
    // ── SCOTUS ──
    setScotusJustices(generateInitialJustices(pp, difficulty, nameRegistryRef.current));
    setScotusVacancy(null);
    setScotusConfirmation(null);
    setPendingScotusEvent(null);
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

  const advance = () => {
    const nextState = runWeeklySimulation({
      week,
      stats,
      prev,
      macroState,
      cg,
      countries,
      stBon,
      stateHist,
      pFx,
      usedEv,
      usedPol,
      activeBill,
      pendingAppointment,
      pendingSignature,
      pendingNegotiation,
      pendingCongressUpdate,
      promises,
      billCooldowns,
      visitedCountries,
      activeOrders,
      eoIssuedCount,
      passedLegislation,
      executiveOverreach,
      engagement,
      powerProjection,
      globalTension,
      lastForeignTripWeek,
      lastMilitarySpending,
      countryStatusSnapshot,
      diplomacyThresholds,
      overreachLastIncreasedWeek,
      overreachLowSinceWeek,
      pendingChainEvents,
      lastSpecialEventWeek,
      visitTypeCounts,
      billLikelihood,
      billFactionVotes,
      billRecord,
      appliedAmendments,
      factionHist,
      cabinet,
      surrogates,
      reconciliationCooldown,
      confirmationHistory,
      congressHistory,
      midtermResults,
      showMidtermModal,
      showInaugurationModal,
      campaignSeasonStarted,
      campaignActivity,
      pollingNoise,
      isPresidentialElection,
      notifications,
      brokenPromises,
      recentDisasters,
      curEv,
      act,
      maxActions,
      log,
    }, {
      previousMacroState: macroState,
      previousStats: stats,
      currentApproval: natA,
      playerParty: pp,
      playerFaction: pf,
      alliedFactions: ALLIED_FACTIONS[pp] || [],
      oppositionFactions: OPPOSITION_FACTIONS[pp] || [],
      advanceMacroEconomy,
      advanceApproval,
      calcStateApproval,
      calcStageAdvance,
      resolveAppointmentStep,
      computeEnthusiasms,
      computeSeatChanges,
      applyElectionSeats,
      applyPostElectionRelEffects,
      buildMidtermResults,
      buildHistorySnapshot,
      buildFedNominationEvent: () => buildFedNominationEvent(nameRegistryRef.current),
      drawName: category => nameRegistryRef.current.drawName(category),
      countryStatus,
    });

    setVisitTypeCounts(nextState.visitTypeCounts);
    setPrev(nextState.prev);
    setStats(nextState.stats);
    setMacroState(nextState.macroState);
    setPFx(nextState.pFx);
    setCampaignSeasonStarted(nextState.campaignSeasonStarted);
    setCampaignActivity(nextState.campaignActivity);
    setPollingNoise(nextState.pollingNoise);
    setIsPresidentialElection(nextState.isPresidentialElection);
    setShowInaugurationModal(nextState.showInaugurationModal);
    setPendingCongressUpdate(nextState.pendingCongressUpdate);
    setCG(nextState.cg);
    setPendingNegotiation(nextState.pendingNegotiation);
    setActiveBill(nextState.activeBill);
    setBillLikelihood(nextState.billLikelihood);
    setBillFactionVotes(nextState.billFactionVotes);
    setPendingSignature(nextState.pendingSignature);
    setBillRecord(nextState.billRecord);
    setUsedPol(nextState.usedPol);
    setBillCooldowns(nextState.billCooldowns);
    setCurEv(nextState.curEv);
    setFactionHist(nextState.factionHist);
    setPendingAppointment(nextState.pendingAppointment);
    setConfirmationHistory(nextState.confirmationHistory);
    setPromises(nextState.promises);
    setBrokenPromises(nextState.brokenPromises);
    setEngagement(nextState.engagement);
    setCabinet(nextState.cabinet);
    setSurrogates(nextState.surrogates);
    setCoachCooldown(nextState.coachCooldown);
    setCountries(nextState.countries);
    setWeek(nextState.week);
    setNotifications(nextState.notifications);
    setRecentDisasters(nextState.recentDisasters);
    setAct(nextState.act);
    setMidtermResults(nextState.midtermResults);
    setShowMidtermModal(nextState.showMidtermModal);
    setCongressHistory(nextState.congressHistory);
    setExecutiveOverreach(nextState.executiveOverreach);
    setOverreachLowSinceWeek(nextState.overreachLowSinceWeek);
    setPowerProjection(nextState.powerProjection);
    setLastMilitarySpending(nextState.lastMilitarySpending);
    setGlobalTension(nextState.globalTension);
    setCountryStatusSnapshot(nextState.countryStatusSnapshot);
    setDiplomacyThresholds(nextState.diplomacyThresholds);
    setPendingChainEvents(nextState.pendingChainEvents);
    setLastSpecialEventWeek(nextState.lastSpecialEventWeek);
    setStateHist(nextState.stateHist);
    setStBon(nextState.stBon);
    setLog(nextState.log);
    setUsedEv(nextState.usedEv);

    setHist(prevHist => {
      const nextHist = { ...prevHist };
      Object.keys(nextState.stats).forEach(key => {
        nextHist[key] = [...(prevHist[key] || []), nextState.stats[key]].slice(-52);
      });
      return nextHist;
    });

    // ── SCOTUS: age justices yearly, check death/retirement, advance confirmation ──
    const nextWiy = ((nextState.week - 1) % 52) + 1;

    // Advance SCOTUS confirmation one stage per week
    if (scotusPendingConfirmation) {
      const appt = scotusPendingConfirmation;
      const nextAppt = { ...appt, turnsInStage: (appt.turnsInStage || 0) + 1 };

      if (appt.stage === "committee_hearing") {
        setScotusConfirmation({ ...nextAppt, stage: "committee_vote", turnsInStage: 0, passLikelihood: 100, lobbyUsedStage: null });
      } else {
        const vote = evaluateAppointment({ ...cg, factions: cg.factions }, appt.factionReactions);
        if (appt.stage === "committee_vote" && vote.passed) {
          setScotusConfirmation({ ...nextAppt, stage: "senate_vote", turnsInStage: 0, factionVotes: vote.factionVotes, passLikelihood: vote.passLikelihood, committeeVote: vote, lobbyUsedStage: null });
        } else if (appt.stage === "senate_vote" || (appt.stage === "committee_vote" && !vote.passed)) {
          // Final result
          const confirmed = vote.passed;
          const resultEvent = {
            id: `scotus_result_${nextState.week}`,
            type: "scotus_result",
            confirmed,
            nomineeName: appt.nomineeName,
            nomineeIdeology: appt.nomineeIdeology,
            nomineeAge: appt.nomineeAge,
            isChief: appt.isChief,
            senateYes: vote.senateYes,
            senateNo: vote.senateNo,
            name: confirmed
              ? `Senate Confirms ${appt.nomineeName}`
              : `Senate Rejects ${appt.nomineeName}`,
            desc: confirmed
              ? `The Senate has confirmed ${appt.nomineeName} (${appt.nomineeIdeology.replace("_", " ")}) to the Supreme Court by a vote of ${vote.senateYes}-${vote.senateNo}.`
              : `The Senate has rejected ${appt.nomineeName} for the Supreme Court by a vote of ${vote.senateYes}-${vote.senateNo}. The seat remains vacant.`,
            choices: [{ text: "Acknowledged", result: "" }],
          };
          setScotusConfirmation(null);
          if (confirmed) {
            // Justice was already removed from the list at vacancy creation; add the confirmed one
            const newJustice = {
              id: `justice_confirmed_${nextState.week}`,
              name: appt.nomineeName,
              ideology: appt.nomineeIdeology,
              party: ["very_liberal", "liberal"].includes(appt.nomineeIdeology) ? "DEM" : "REP",
              age: appt.nomineeAge,
              timeServed: 0,
              isChief: appt.isChief,
            };
            setScotusJustices(prev => [...prev, newJustice]);
            setScotusVacancy(null);
            addLog(`${appt.nomineeName} confirmed to the Supreme Court ${vote.senateYes}-${vote.senateNo}.`);
          } else {
            // Rejection: vacancy stays open but go back to selecting
            setScotusVacancy(prev => prev ? { ...prev, stage: "selecting", candidates: generateScotusJusticeCandidates(pp, nameRegistryRef.current), selectedId: null, vetMoreUsed: false } : prev);
            addLog(`${appt.nomineeName} rejected by the Senate ${vote.senateYes}-${vote.senateNo}. A new selection is available.`);
          }
          setConfirmationHistory(prev => [...prev, {
            id: `scotus_${nextState.week}`,
            officeId: "scotus",
            officeLabel: "Supreme Court Justice",
            nomineeName: appt.nomineeName,
            passed: confirmed,
            senateYes: vote.senateYes,
            senateNo: vote.senateNo,
            year: Math.ceil(nextState.week / 52),
            weekOfYear: nextWiy,
          }]);
          // Show CrisisModal for result
          if (!nextState.curEv) {
            setCurEv(resultEvent);
          } else {
            setPendingScotusEvent(resultEvent);
          }
        }
      }
    }

    // Check for new vacancy (only when no vacancy already open)
    if (!scotusVacancy && !scotusPendingConfirmation && scotusJustices.length > 0) {
      const vacancy = checkJusticeVacancy(scotusJustices, pp);
      if (vacancy) {
        const j = vacancy.justice;
        const vacancyEvent = {
          id: `scotus_vacancy_${nextState.week}`,
          type: "scotus_vacancy",
          justiceId: j.id,
          isChief: j.isChief,
          name: vacancy.type === "death"
            ? `Justice ${j.name} Has Died`
            : `Justice ${j.name} Announces Retirement`,
          desc: vacancy.type === "death"
            ? `Justice ${j.name} (${j.ideology.replace(/_/g, " ")}, age ${j.age}) has passed away. A Supreme Court vacancy must be filled.`
            : `Justice ${j.name} (${j.ideology.replace(/_/g, " ")}, age ${j.age}, ${j.timeServed} years served) has announced their retirement from the Supreme Court. A vacancy opens.`,
          choices: [{ text: "Begin nomination process", result: "" }],
        };
        // Remove justice from the bench
        setScotusJustices(prev => prev.filter(jj => jj.id !== j.id));
        // Open vacancy in selecting stage
        setScotusVacancy({
          justiceId: j.id,
          isChief: j.isChief,
          stage: "selecting",
          candidates: generateScotusJusticeCandidates(pp, nameRegistryRef.current),
          selectedId: null,
          vetMoreUsed: false,
        });
        addLog(`Supreme Court vacancy: Justice ${j.name} ${vacancy.type === "death" ? "died" : "retired"}.`);
        if (!nextState.curEv) {
          setCurEv(vacancyEvent);
        } else {
          setPendingScotusEvent(vacancyEvent);
        }
      }
    }

    // Age justices once per year (week 1)
    if (nextWiy === 1) {
      setScotusJustices(prev => ageJustices(prev));
    }

    if ((((nextState.week - 1) % 52) + 1) === 1) {
      refreshPromiseOffers({
        factions: nextState.cg.factions,
        week: nextState.week,
        cabinetState: nextState.cabinet,
        pendingAppointment: nextState.pendingAppointment,
      });
    }
  };

  const handleEventChoice = choice => {
    // SCOTUS vacancy / result events are UI-only acknowledgements
    if (curEv?.type === "scotus_vacancy" || curEv?.type === "scotus_result") {
      setCurEv(pendingScotusEvent || null);
      setPendingScotusEvent(null);
      return;
    }

    const result = resolveEventChoice({
      stats,
      macroState,
      factions: cg.factions,
      countries,
      stBon,
      curEv,
      choice,
      week,
      buildAppointmentProcess,
      pickFedChairName,
      nameRegistry: nameRegistryRef.current,
    });
    setPrev({ ...stats });
    setStats(result.stats);
    setMacroState(result.macroState);
    setCG({ ...cg, factions: result.factions });
    setCountries(result.countries);
    setStBon(result.stBon);
    if (curEv.engagementEffect) setEngagement(e => Math.max(0, Math.min(50, e + curEv.engagementEffect)));
    if (result.globalTensionDelta) setGlobalTension(t => Math.max(0, Math.min(50, t + result.globalTensionDelta)));
    if (result.pendingChainEvent) setPendingChainEvents(prev => [...prev, result.pendingChainEvent]);
    if (result.pendingAppointment) setPendingAppointment(result.pendingAppointment);
    result.logs.forEach(addLog);
    result.notifications.forEach(addNotification);
    if (result.recentDisasterWeek != null && curEv.affectedStates) {
      setRecentDisasters(rd => {
        const next = { ...rd };
        curEv.affectedStates.forEach(abbr => { next[abbr] = result.recentDisasterWeek; });
        return next;
      });
    }
    // After resolving a normal event, flush any queued SCOTUS event
    setCurEv(pendingScotusEvent || null);
    setPendingScotusEvent(null);
  };

  const propose = action => {
    if (act >= maxActions || usedPol.has(action.id) || activeBill) return;
    if (billCooldowns[action.id] && week < billCooldowns[action.id]) return;
    if (lockedBills.has(action.id)) return;
    const result = resolveBillProposal({
      action,
      factions: cg.factions,
      alliedFactionIds: ALLIED_FACTIONS[pp] || [],
      calcStageAdvance,
      cg,
      playerFaction: pf,
    });
    setCG(result.cg);
    setActiveBill(result.activeBill);
    setBillLikelihood(result.billLikelihood);
    setBillFactionVotes(result.billFactionVotes);
    setUsedPol(p => new Set([...p, action.id]));
    setBillCooldowns(c => { const nc = { ...c }; delete nc[action.id]; return nc; });
    setAct(n => n + 2); // costs 2 actions
    addLog(result.log);
  };

  const makePromise = (factionId, offer) => {
    if (!offer) return;
    if (offer.type === "cabinet" && cabinet.secState.occupantName) return;
    setPendingPromise({ factionId, ...offer });
  };

  const confirmPromise = () => {
    if (!pendingPromise) return;
    const result = resolvePromiseConfirmation({ pendingPromise, week, factions: cg.factions });
    setCG({ ...cg, factions: result.factions });
    setPromises(p => [...p, result.promise]);
    addLog(result.log);
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
    const factionFx = COUNTRY_FACTION_EFFECTS[countryId] || {};
    const result = resolveForeignVisit({
      country,
      countryId,
      factions: cg.factions,
      countries,
      stats,
      macroState,
      actionCost,
      factionEffects: factionFx,
    });
    setCountries(result.countries);
    setCG({ ...cg, factions: result.factions });
    setStats(result.stats);
    setAct(n => n + result.actionCost);
    if (campaignSeasonStarted) setCampaignActivity(n => n + 1);
    setVisitedCountries(p => ({ ...p, [countryId]: week + 52 }));
    setEngagement(e => Math.min(50, e + result.engagement));
    setLastForeignTripWeek(week);
    setForeignVisitResult(result.result);
    addLog(result.log);
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
    if (shouldTriggerProgressiveHeckling(visitType, visitState, visitNF.prog?.relationship ?? 50, usedEv, Math.random)) {
      setUsedEv(prev => new Set([...prev, PROGRESSIVE_HECKLER_EVENT.id]));
      setCurEv(PROGRESSIVE_HECKLER_EVENT);
    }
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
    const result = resolveExecutiveOrder({
      eo,
      extraData,
      week,
      count,
      stats,
      macroState,
      factions: cg.factions,
      countries,
      stBon,
      activeOrders,
      executiveOverreach,
      oppositionFactionIds: OPPOSITION_FACTIONS[pp] || [],
      buildExecutiveOrderOutcome,
      drillingRegionStateMap: DRILLING_REGION_STATE_MAP,
    });
    setStats(result.stats);
    setMacroState(result.macroState);
    setPFx(prev => [...prev, ...result.pFx]);
    setCG({ ...cg, factions: result.factions });
    setStBon(result.stBon);
    setCountries(result.countries);
    if (result.engagementDelta) setEngagement(e => Math.max(0, e + result.engagementDelta));
    if (result.maxActions) setMaxActions(result.maxActions);
    setActiveOrders(result.activeOrders);
    setEoIssuedCount(prev => ({ ...prev, [eo.id]: count + 1 }));
    setPassedLegislation(prev => ({ ...prev, [eo.id]: week }));
    setExecutiveOverreach(result.overreach);
    setOverreachLastIncreasedWeek(week);
    setOverreachLowSinceWeek(result.overreach <= 31 ? week : 0);
    if (eo.id === "sanctions" && extraData.targetCountryId === "china") {
      setPendingChainEvents(prev => [...prev, { triggerAtWeek: week + 1, event: CHINA_SANCTIONS_RETALIATION_EVENT }]);
    }
    setAct(n => n + 2);
    setSelectedEO(null);
    setEoChoice({});
    addLog(result.log);
    setEoResult(result.eoResult);
  };

  const signBill = () => {
    if (!pendingSignature) return;
    const result = resolveSignedBill({
      pendingSignature: { ...pendingSignature, appliedAmendments: appliedAmendments[pendingSignature.act.id] || [], presidentName: pn },
      stats,
      macroState,
      pFx,
      stBon,
      countries,
      factions: cg.factions,
      executiveOverreach,
      week,
      playerParty: pp,
    });
    setStats(result.stats);
    setMacroState(result.macroState);
    setPFx(result.pFx);
    setStBon(result.stBon);
    setCountries(result.countries);
    setCG({ ...cg, factions: result.factions });
    result.extraLogs.forEach(addLog);
    if (result.locks.length > 0) setLockedBills(p => new Set([...p, ...result.locks]));
    setBillRecord(r => [...r, result.billRecordEntry]);
    setPassedLegislation(prev => ({ ...prev, [pendingSignature.act.id]: week }));
    setExecutiveOverreach(result.overreach);
    setOverreachLowSinceWeek(result.overreach <= 31 ? (overreachLowSinceWeek || week) : 0);
    if (result.engagementDelta) setEngagement(e => Math.max(0, Math.min(50, e + result.engagementDelta)));
    if (result.powerProjectionDelta) setPowerProjection(p => Math.max(0, Math.min(50, p + result.powerProjectionDelta)));
    if (result.reconciliationCooldown) setReconciliationCooldown(result.reconciliationCooldown);
    addLog(result.log);
    setPendingSignature(null);
  };

  const vetoBill = () => {
    if (!pendingSignature) return;
    const { act, isBudget } = pendingSignature;
    const result = resolveVetoedBill({ pendingSignature, factions: cg.factions, stats, macroState, week });
    setCG({ ...cg, factions: result.factions });
    setStats(result.stats);

    // Allow re-introduction after cooldown
    if (isBudget) {
      setReconciliationCooldown(week + 8);
      setUsedPol(p => { const np = new Set(p); np.delete("budget_reconciliation"); return np; });
    } else {
      setUsedPol(p => { const np = new Set(p); np.delete(act.id); return np; });
      setBillCooldowns(c => ({ ...c, [act.id]: week + 8 }));
    }

    const billAmends = (appliedAmendments[act.id] || []).map(id => (BILL_AMENDMENTS[act.id] || []).find(a => a.id === id)).filter(Boolean);
    setBillRecord(r => [...r, { ...result.billRecordEntry, amendments: billAmends }]);
    addLog(`${result.log} by President ${pn}`);
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
    const result = resolveSpeech({
      pos,
      stats,
      macroState,
      factions: cg.factions,
      speechTopic,
      topics: SPEECH_TOPICS,
      alliedFactionIds: ALLIED_FACTIONS[pp] || [],
    });
    setCG({ ...cg, factions: result.factions });
    setStats(result.stats);
    setAct(n => n + 1);
    if (campaignSeasonStarted) setCampaignActivity(n => n + 1);
    addLog(result.log);
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
    <SetupScreen
      pp={pp}
      setPP={setPP}
      pf={pf}
      setPF={setPF}
      pn={pn}
      setPN={setPN}
      vpn={vpn}
      setVpn={setVpn}
      difficulty={difficulty}
      setDifficulty={setDifficulty}
      onStart={start}
    />
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
          vpn={vpn}
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

      {tab === "judiciary" && (
        <JudiciaryTab
          scotusJustices={scotusJustices}
          scotusVacancy={scotusVacancy}
          scotusPendingConfirmation={scotusPendingConfirmation}
          playerParty={pp}
          surrogates={surrogates}
          allFactions={[...FACTION_DATA.DEM, ...FACTION_DATA.REP]}
          onSelectCandidate={selectScotusCandidate}
          onNominate={nominateScotusCandidate}
          onVetMore={vetMoreScotus}
          onLobbyScotus={lobbyScotus}
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
