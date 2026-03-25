import { describe, expect, it } from "vitest";

import { canStartBudgetReconciliation } from "../budgetReconciliation.js";

describe("canStartBudgetReconciliation", () => {
  it("requires the same 2-action capacity as normal bill proposals", () => {
    expect(canStartBudgetReconciliation({
      act: 3,
      maxActions: 4,
      activeBills: [],
      reconciliationCooldown: 0,
      week: 10,
    })).toBe(false);
  });

  it("blocks reconciliation while the annual cooldown is active", () => {
    expect(canStartBudgetReconciliation({
      act: 0,
      maxActions: 4,
      activeBills: [],
      reconciliationCooldown: 52,
      week: 40,
    })).toBe(false);
  });

  it("allows reconciliation when actions, bill capacity, and cooldown all permit it", () => {
    expect(canStartBudgetReconciliation({
      act: 0,
      maxActions: 4,
      activeBills: [],
      reconciliationCooldown: 52,
      week: 52,
    })).toBe(true);
  });
});
