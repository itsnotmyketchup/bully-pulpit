import { describe, expect, it, vi } from "vitest";

import { INITIAL_STATS } from "../../data/stats.js";
import { createInitialMacroState } from "../macroEconomy.js";
import { runWeeklySimulation } from "../weeklySimulation.js";

function buildSnapshot(overrides = {}) {
  return {
    week: 52,
    stats: { ...INITIAL_STATS },
    prev: { ...INITIAL_STATS },
    macroState: createInitialMacroState("Test Chair"),
    cg: {
      pp: "DEM",
      factions: {
        prog: { id: "prog", name: "Progressive Caucus", party: "DEM", relationship: 60, trust: 60, unity: 70, senateSeats: 20, houseSeats: 90 },
        mod_dem: { id: "mod_dem", name: "New Democrats", party: "DEM", relationship: 60, trust: 60, unity: 70, senateSeats: 20, houseSeats: 90 },
        blue_dog: { id: "blue_dog", name: "Blue Dogs", party: "DEM", relationship: 60, trust: 60, unity: 70, senateSeats: 10, houseSeats: 40 },
        freedom: { id: "freedom", name: "Freedom Caucus", party: "REP", relationship: 40, trust: 40, unity: 70, senateSeats: 15, houseSeats: 60 },
        mod_rep: { id: "mod_rep", name: "Main Street", party: "REP", relationship: 45, trust: 45, unity: 70, senateSeats: 20, houseSeats: 80 },
        trad_con: { id: "trad_con", name: "Traditional Conservatives", party: "REP", relationship: 42, trust: 42, unity: 70, senateSeats: 15, houseSeats: 75 },
      },
    },
    countries: [],
    stBon: {},
    stateHist: {},
    pFx: [{ week: 53, name: "Queued boost", effects: { approvalRating: 2 }, macroEffects: {} }],
    usedEv: new Set(),
    usedPol: new Set(),
    activeBill: null,
    pendingAppointment: null,
    pendingSignature: null,
    pendingNegotiation: null,
    pendingCongressUpdate: {
      newFactions: {
        prog: { id: "prog", name: "Progressive Caucus", party: "DEM", relationship: 65, trust: 60, unity: 70, senateSeats: 22, houseSeats: 95 },
      },
      houseNetChange: 5,
      senateNetChange: 2,
    },
    promises: [],
    billCooldowns: {},
    visitedCountries: {},
    activeOrders: [],
    eoIssuedCount: {},
    passedLegislation: {},
    executiveOverreach: 20,
    engagement: 25,
    powerProjection: 40,
    globalTension: 25,
    lastForeignTripWeek: 0,
    lastMilitarySpending: INITIAL_STATS.militarySpending,
    countryStatusSnapshot: {},
    diplomacyThresholds: { tensionHigh: false, engagementLow: false, projectionWeak: false },
    overreachLastIncreasedWeek: 0,
    overreachLowSinceWeek: 1,
    pendingChainEvents: [],
    lastSpecialEventWeek: 0,
    visitTypeCounts: {},
    billLikelihood: null,
    billFactionVotes: null,
    billRecord: [],
    appliedAmendments: {},
    factionHist: {},
    cabinet: { secState: { occupantName: "Secretary", factionId: "prog", party: "DEM", startWeek: 1, candidates: [], selectedCandidateId: null } },
    surrogates: [],
    reconciliationCooldown: 0,
    confirmationHistory: [],
    congressHistory: [],
    midtermResults: null,
    showMidtermModal: false,
    showInaugurationModal: false,
    campaignSeasonStarted: false,
    campaignActivity: 0,
    pollingNoise: 0,
    isPresidentialElection: false,
    notifications: [],
    brokenPromises: [],
    recentDisasters: {},
    curEv: null,
    act: 0,
    maxActions: 4,
    log: [],
    ...overrides,
  };
}

function buildDeps(snapshot) {
  return {
    previousMacroState: snapshot.macroState,
    previousStats: snapshot.stats,
    currentApproval: snapshot.stats.approvalRating,
    playerParty: "DEM",
    playerFaction: "prog",
    alliedFactions: ["prog", "mod_dem", "blue_dog"],
    oppositionFactions: ["freedom", "mod_rep", "trad_con"],
    advanceMacroEconomy: (macroState, stats) => ({ macroState: { ...macroState, impulses: { ...macroState.impulses } }, derived: { unemployment: stats.unemployment, inflation: stats.inflation } }),
    advanceApproval: stats => stats.approvalRating,
    calcStateApproval: () => 50,
    calcStageAdvance: vi.fn(),
    resolveAppointmentStep: vi.fn(),
    computeEnthusiasms: vi.fn(),
    computeSeatChanges: vi.fn(),
    applyElectionSeats: vi.fn(),
    applyPostElectionRelEffects: vi.fn(),
    buildMidtermResults: vi.fn(),
    buildHistorySnapshot: vi.fn(),
    buildFedNominationEvent: vi.fn(),
    drawName: () => "New Leader",
    countryStatus: () => "NEUTRAL",
  };
}

describe("runWeeklySimulation", () => {
  it("preserves weekly flow while extracting the engine into phases", () => {
    const snapshot = buildSnapshot();
    const result = runWeeklySimulation(snapshot, buildDeps(snapshot));

    expect(result.week).toBe(53);
    expect(result.showInaugurationModal).toBe(true);
    expect(result.pendingCongressUpdate).toBe(null);
    expect(result.stats.approvalRating).toBeGreaterThan(snapshot.stats.approvalRating);
    expect(result.log.some(entry => entry.text.includes("New Congress sworn in"))).toBe(true);
  });
});
