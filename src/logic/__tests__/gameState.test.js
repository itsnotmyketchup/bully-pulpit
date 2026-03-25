import { describe, expect, it } from "vitest";

import { INITIAL_STATS } from "../../data/stats.js";
import { createBudgetDraft, createInitialCabinetState, createStatHistory } from "../gameState.js";

describe("game state helpers", () => {
  it("creates a clean cabinet state", () => {
    expect(createInitialCabinetState()).toEqual({
      secState: {
        occupantName: null,
        factionId: null,
        party: null,
        startWeek: null,
        candidates: [],
        selectedCandidateId: null,
      },
    });
  });

  it("seeds stat history from the current stat snapshot", () => {
    const history = createStatHistory(INITIAL_STATS);

    expect(history.approvalRating).toEqual([INITIAL_STATS.approvalRating]);
    expect(history.population).toEqual([INITIAL_STATS.population]);
  });

  it("creates a budget draft anchored to the current policy values", () => {
    const draft = createBudgetDraft(INITIAL_STATS);

    expect(draft.corporateTaxRate).toBe(0);
    expect(draft.medicareEligibilityAge).toBe(INITIAL_STATS.medicareEligibilityAge);
    expect(draft.evTaxCredit).toBe(INITIAL_STATS.evTaxCredit);
  });
});
