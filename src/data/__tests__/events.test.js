import { describe, expect, it } from "vitest";

import {
  annualChanceToPerCheckChance,
  generateDynamicEvents,
  rollEligibleSpecialEvents,
} from "../events.js";
import { INITIAL_STATS } from "../stats.js";

const BASE_STATE_APPROVAL = {
  CA: 52,
  TX: 48,
  NY: 54,
  FL: 49,
  OH: 50,
  PA: 51,
};

describe("generateDynamicEvents", () => {
  it("returns separated pools with playable events", () => {
    const pools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      1,
      {},
      []
    );

    expect(Array.isArray(pools.normalPool)).toBe(true);
    expect(Array.isArray(pools.specialPool)).toBe(true);
    expect(Array.isArray(pools.immediatePool)).toBe(true);
    expect(pools.normalPool.length).toBeGreaterThan(0);

    [...pools.normalPool, ...pools.specialPool, ...pools.immediatePool].forEach((event) => {
      expect(event.id).toBeTruthy();
      expect(event.name).toBeTruthy();
      expect(event.desc).toBeTruthy();
      expect(Array.isArray(event.choices)).toBe(true);
      expect(event.choices.length).toBeGreaterThan(0);
      expect(event.category).toBeTruthy();
      event.choices.forEach((choice) => {
        expect(choice.text).toBeTruthy();
      });
    });
  });

  it("places diplomacy and policy consequence events in the special pool", () => {
    const pools = generateDynamicEvents(
      {
        ...INITIAL_STATS,
        corporateTaxRate: 18,
        educationSpending: 90,
      },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      12,
      {
        immigration_enforcement: 4,
        defense_mod: 4,
        marijuana_fed: 4,
      },
      [
        { id: "israel", relationship: 65 },
        { id: "russia", relationship: 25 },
      ]
    );

    const specialIds = new Set(pools.specialPool.map((event) => event.id));
    expect(specialIds.has("liberal_states_refuse")).toBe(true);
    expect(specialIds.has("pentagon_audit_fail")).toBe(true);
    expect(specialIds.has("weed_industry_boom")).toBe(true);
    expect(specialIds.has("anti_israel_protests")).toBe(true);
    expect(specialIds.has("russia_hostage")).toBe(true);
    expect(specialIds.has("corp_profits_surge")).toBe(true);
    expect(specialIds.has("literacy_crisis")).toBe(true);
  });

  it("keeps already-used unique special events out of the pool", () => {
    const pools = generateDynamicEvents(
      { ...INITIAL_STATS, corporateTaxRate: 18 },
      BASE_STATE_APPROVAL,
      new Set(["corp_profits_surge"]),
      "DEM",
      12,
      {},
      []
    );

    expect(pools.specialPool.some((event) => event.id === "corp_profits_surge")).toBe(false);
  });
});

describe("special event rarity helpers", () => {
  it("converts annual chance into a per-check chance", () => {
    const perCheck = annualChanceToPerCheckChance(0.7, 4.55);
    expect(perCheck).toBeGreaterThan(0);
    expect(perCheck).toBeLessThan(1);
    expect(perCheck).toBeCloseTo(0.23249, 5);
  });

  it("rolls eligible special events independently", () => {
    const passed = rollEligibleSpecialEvents(
      [
        { id: "sure_thing", annualChance: 0.7 },
        { id: "coin_flip", annualChance: 0.5 },
      ],
      1,
      (() => {
        const values = [0.2, 0.6];
        return () => values.shift();
      })()
    );

    expect(passed.map((event) => event.id)).toEqual(["sure_thing"]);
  });
});
