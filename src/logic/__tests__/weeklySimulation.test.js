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
    nextExecutiveOrderCourtCheckWeek: null,
    pendingJudicialEvent: null,
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
    scotusJustices: [],
    scotusRulings: [],
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

  it("prefers higher-priority consequence events when multiple event lanes roll in the same week", () => {
    const snapshot = buildSnapshot({
      week: 11,
      pendingCongressUpdate: null,
      passedLegislation: {
        immigration_enforcement: 1,
        marijuana_fed: 1,
      },
      countries: [{ id: "russia", relationship: 20, trust: 40, status: "HOSTILE", name: "Russia" }],
    });
    const mathRandomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    const result = runWeeklySimulation(snapshot, buildDeps(snapshot));

    expect(result.week).toBe(12);
    expect(result.curEv?.category).toBe("special");

    mathRandomSpy.mockRestore();
  });

  it("accelerates environmental transition when technology and energy spending are higher", () => {
    const highSnapshot = buildSnapshot({
      stats: {
        ...INITIAL_STATS,
        energyEnvironmentSpending: 80,
      },
      macroState: {
        ...createInitialMacroState("Test Chair"),
        technologicalAdvancement: 80,
      },
      pendingCongressUpdate: null,
      pFx: [],
    });
    const lowSnapshot = buildSnapshot({
      stats: {
        ...INITIAL_STATS,
        energyEnvironmentSpending: 10,
      },
      macroState: {
        ...createInitialMacroState("Test Chair"),
        technologicalAdvancement: 25,
      },
      pendingCongressUpdate: null,
      pFx: [],
    });

    const highResult = runWeeklySimulation(highSnapshot, buildDeps(highSnapshot));
    const lowResult = runWeeklySimulation(lowSnapshot, buildDeps(lowSnapshot));

    expect(highResult.stats.powerSolarShare - INITIAL_STATS.powerSolarShare).toBeGreaterThan(lowResult.stats.powerSolarShare - INITIAL_STATS.powerSolarShare);
    expect(highResult.stats.powerWindShare - INITIAL_STATS.powerWindShare).toBeGreaterThan(lowResult.stats.powerWindShare - INITIAL_STATS.powerWindShare);
    expect(INITIAL_STATS.powerCoalShare - highResult.stats.powerCoalShare).toBeGreaterThan(INITIAL_STATS.powerCoalShare - lowResult.stats.powerCoalShare);
    expect(highResult.stats.evShareNewCars - INITIAL_STATS.evShareNewCars).toBeGreaterThan(lowResult.stats.evShareNewCars - INITIAL_STATS.evShareNewCars);
    expect(INITIAL_STATS.carbonEmissionsPerCapita - highResult.stats.carbonEmissionsPerCapita).toBeGreaterThan(INITIAL_STATS.carbonEmissionsPerCapita - lowResult.stats.carbonEmissionsPerCapita);
  });

  it("runs a start-of-turn appellate review when an EO court check is due", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const snapshot = buildSnapshot({
      pendingCongressUpdate: null,
      pFx: [],
      activeOrders: [{
        id: "buy_american",
        name: "Tighten Buy American Rules",
        issuedWeek: 20,
        active: true,
        choiceData: {},
        courtStatus: "active",
        invalidatedWeek: null,
        appealFiledWeek: null,
        outcomeSnapshot: { effects: { tradeBalance: 1.8 }, macroEffects: { nx: 0.08, investment: -0.05 }, delayedEffects: null, delayedMacroEffects: null, factionReactions: {}, stateEffects: null },
      }],
      nextExecutiveOrderCourtCheckWeek: 53,
    });

    const result = runWeeklySimulation(snapshot, buildDeps(snapshot));

    expect(result.curEv?.type).toBe("eo_appeals_upheld");
    expect(result.stats.approvalRating).toBeGreaterThan(snapshot.stats.approvalRating);

    randomSpy.mockRestore();
  });

  it("does not reconsider an EO after the appeals court has already upheld it", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const snapshot = buildSnapshot({
      pendingCongressUpdate: null,
      pFx: [],
      activeOrders: [{
        id: "buy_american",
        name: "Tighten Buy American Rules",
        issuedWeek: 20,
        active: true,
        choiceData: {},
        courtStatus: "appeals_upheld",
        invalidatedWeek: null,
        appealFiledWeek: null,
        outcomeSnapshot: { effects: { tradeBalance: 1.8 }, macroEffects: { nx: 0.08, investment: -0.05 }, delayedEffects: null, delayedMacroEffects: null, factionReactions: {}, stateEffects: null },
      }],
      nextExecutiveOrderCourtCheckWeek: 53,
    });

    const result = runWeeklySimulation(snapshot, buildDeps(snapshot));

    expect(result.curEv ?? null).toBe(null);
    expect(result.activeOrders[0].courtStatus).toBe("appeals_upheld");

    randomSpy.mockRestore();
  });

  it("resolves pending EO cert-review chain events before normal random events", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const snapshot = buildSnapshot({
      pendingCongressUpdate: null,
      pFx: [],
      activeOrders: [{
        id: "border_emergency",
        name: "Emergency Border Declaration",
        issuedWeek: 30,
        active: true,
        choiceData: {},
        courtStatus: "scotus_pending_cert",
        invalidatedWeek: null,
        appealFiledWeek: 50,
        outcomeSnapshot: { effects: { immigrationRate: -0.25 }, macroEffects: {}, delayedEffects: null, delayedMacroEffects: null, factionReactions: { prog: -0.9, mod_dem: -0.4, blue_dog: 0.2, mod_rep: 0.3, trad_con: 0.5, freedom: 0.7 }, stateEffects: { border: true, weight: 0.05 } },
      }],
      pendingChainEvents: [{ triggerAtWeek: 53, event: { type: "eo_scotus_cert_check", orderId: "border_emergency" } }],
    });

    const result = runWeeklySimulation(snapshot, buildDeps(snapshot));

    expect(result.curEv?.type).toBe("eo_scotus_cert_granted");

    randomSpy.mockRestore();
  });
});
