import { describe, expect, it, vi } from "vitest";

import { INITIAL_STATS } from "../../data/stats.js";
import { createInitialMacroState } from "../macroEconomy.js";
import {
  computeScotusDecision,
  getCertGrantProbability,
  getEligibleJudicialReviewOrders,
  getLegalStrikeProbability,
  invalidateExecutiveOrder,
  pickWeightedJudicialReviewOrder,
} from "../executiveOrderJudiciary.js";

function buildActiveOrder(overrides = {}) {
  return {
    id: "border_emergency",
    name: "Emergency Border Declaration",
    issuedWeek: 10,
    active: true,
    choiceData: {},
    courtStatus: "active",
    invalidatedWeek: null,
    appealFiledWeek: null,
    outcomeSnapshot: {
      effects: { immigrationRate: -0.25 },
      macroEffects: {},
      delayedEffects: null,
      delayedMacroEffects: null,
      factionReactions: { prog: -0.9, mod_dem: -0.4, blue_dog: 0.2, mod_rep: 0.3, trad_con: 0.5, freedom: 0.7 },
      stateEffects: { border: true, weight: 0.05 },
      specialEffects: null,
    },
    ...overrides,
  };
}

describe("executiveOrderJudiciary", () => {
  it("filters eligible judicial review orders to active orders issued within the last year", () => {
    const eligible = getEligibleJudicialReviewOrders([
      buildActiveOrder(),
      buildActiveOrder({ id: "buy_american", name: "Tighten Buy American Rules", issuedWeek: 0 }),
      buildActiveOrder({ id: "epa_rollback", active: false }),
      buildActiveOrder({ id: "tariffs", courtStatus: "scotus_pending_cert" }),
    ], 53);

    expect(eligible.map(order => order.id)).toEqual(["border_emergency"]);
  });

  it("weights selection toward higher-risk executive orders", () => {
    const rng = vi.fn()
      .mockReturnValueOnce(0.99);
    const picked = pickWeightedJudicialReviewOrder([
      buildActiveOrder({ id: "buy_american", name: "Tighten Buy American Rules" }),
      buildActiveOrder({ id: "border_emergency", name: "Emergency Border Declaration" }),
    ], 20, rng);

    expect(picked?.id).toBe("border_emergency");
  });

  it("maps legal risk and controversy to the expected strike and cert probabilities", () => {
    expect(getLegalStrikeProbability(0)).toBe(0);
    expect(getLegalStrikeProbability(4)).toBe(0.75);
    expect(getCertGrantProbability(1)).toBe(0.33);
    expect(getCertGrantProbability(3)).toBe(1);
  });

  it("can compute a plausible Supreme Court strike-down majority", () => {
    const decision = computeScotusDecision(buildActiveOrder(), [
      { id: "j1", name: "Justice A", ideology: "very_liberal" },
      { id: "j2", name: "Justice B", ideology: "very_liberal" },
      { id: "j3", name: "Justice C", ideology: "liberal" },
      { id: "j4", name: "Justice D", ideology: "liberal" },
      { id: "j5", name: "Justice E", ideology: "liberal" },
      { id: "j6", name: "Justice F", ideology: "conservative" },
      { id: "j7", name: "Justice G", ideology: "conservative" },
      { id: "j8", name: "Justice H", ideology: "very_conservative" },
      { id: "j9", name: "Justice I", ideology: "very_conservative" },
    ], () => 0.5);

    expect(decision?.strikesDown).toBe(true);
    expect(decision?.yesVotes).toBeGreaterThanOrEqual(5);
    expect(decision?.majorityJustices.length).toBe(decision?.yesVotes);
    expect(decision?.dissentJustices.length).toBe(decision?.noVotes);
    expect(decision?.opinionAuthor?.name).toBeTruthy();
    expect(decision?.dissentAuthor?.name).toBeTruthy();
  });

  it("invalidates an EO by reversing persistent effects and removing delayed queue entries", () => {
    const stats = { ...INITIAL_STATS, immigrationRate: INITIAL_STATS.immigrationRate - 0.25 };
    const macroState = createInitialMacroState("Test Chair");
    const result = invalidateExecutiveOrder({
      activeOrders: [buildActiveOrder()],
      orderId: "border_emergency",
      invalidatedWeek: 30,
      stats,
      macroState,
      stBon: { TX: 0.05, AZ: 0.05 },
      pFx: [
        { week: 40, name: "Queued court-safe effect", sourceType: "executive_order", sourceId: "border_emergency", effects: { approvalRating: 1 }, macroEffects: {} },
        { week: 40, name: "Other effect", sourceType: "bill", sourceId: "ev_acceleration", effects: { approvalRating: 1 }, macroEffects: {} },
      ],
      drillingRegionStateMap: {},
      maxActions: 4,
    });

    expect(result.activeOrders[0].active).toBe(false);
    expect(result.activeOrders[0].courtStatus).toBe("invalidated");
    expect(result.stats.immigrationRate).toBeCloseTo(INITIAL_STATS.immigrationRate, 5);
    expect(result.pFx).toHaveLength(1);
    expect(result.pFx[0].sourceId).toBe("ev_acceleration");
  });
});
