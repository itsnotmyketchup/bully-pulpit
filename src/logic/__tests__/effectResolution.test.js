import { describe, expect, it } from "vitest";

import { STATE_DATA } from "../../data/states.js";
import { INITIAL_STATS } from "../../data/stats.js";
import { createInitialMacroState } from "../macroEconomy.js";
import { applyEffectsBundle, applyStateActionEffects } from "../effectResolution.js";

describe("applyEffectsBundle", () => {
  it("applies visible and macro effects without mutating inputs", () => {
    const stats = { ...INITIAL_STATS };
    const macroState = createInitialMacroState("Test Chair");

    const result = applyEffectsBundle(
      stats,
      macroState,
      { nationalDebt: 0.05, scienceTechnologySpending: 20 },
      { macroEffects: { confidence: 0.1 } }
    );

    expect(result.stats).not.toBe(stats);
    expect(result.macroState).not.toBe(macroState);
    expect(result.stats.nationalDebt).toBeCloseTo(stats.nationalDebt + 0.05, 5);
    expect(result.stats.scienceTechnologySpending).toBe(stats.scienceTechnologySpending + 20);
    expect(result.macroState.impulses.confidence).toBeGreaterThan(macroState.impulses.confidence);
  });
});

describe("applyStateActionEffects", () => {
  it("applies regional and drilling-region boosts through one helper", () => {
    const bonuses = applyStateActionEffects({}, {
      stateEffects: {
        region: ["south"],
        drillingRegions: ["gulf"],
        weight: 0.02,
      },
    }, STATE_DATA, { gulf: ["TX", "LA"] });

    expect(bonuses.TX).toBeGreaterThan(0);
    expect(bonuses.LA).toBeGreaterThan(0);
  });
});
