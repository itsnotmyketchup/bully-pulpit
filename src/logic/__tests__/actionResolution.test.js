import { describe, expect, it, vi } from "vitest";

import { POLICY_ACTIONS } from "../../data/policies.js";
import { INITIAL_STATS } from "../../data/stats.js";
import { resolveSignedBill } from "../actionResolution.js";
import { createInitialMacroState } from "../macroEconomy.js";

describe("resolveSignedBill", () => {
  it("applies EV bill amendments to fiscal and delayed adoption effects", () => {
    const evBill = POLICY_ACTIONS.find((action) => action.id === "ev_acceleration");
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    const result = resolveSignedBill({
      pendingSignature: {
        act: evBill,
        votes: { senateYes: 55, senateNo: 45, houseYes: 240, houseNo: 195 },
        appliedAmendments: ["ev_credit_trim", "ev_infra_earmarks"],
      },
      stats: { ...INITIAL_STATS },
      macroState: createInitialMacroState("Test Chair"),
      pFx: [],
      stBon: {},
      countries: [],
      factions: {},
      executiveOverreach: 20,
      week: 10,
      playerParty: "DEM",
    });

    expect(result.stats.energyEnvironmentSpending).toBe(INITIAL_STATS.energyEnvironmentSpending + 20);
    expect(result.stats.infrastructureSpending).toBe(INITIAL_STATS.infrastructureSpending + 10);
    expect(result.stats.cleanVehicleTaxCreditCost).toBe(6);
    expect(result.macroState.technologicalAdvancement).toBeGreaterThan(createInitialMacroState("Test Chair").technologicalAdvancement);
    expect(result.pFx).toHaveLength(1);
    expect(result.pFx[0].week).toBe(34);
    expect(result.pFx[0].effects.evAdoptionIncentive).toBeCloseTo(0.65, 5);

    randomSpy.mockRestore();
  });
});
