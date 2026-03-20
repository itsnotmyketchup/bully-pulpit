import { describe, expect, it } from "vitest";

import {
  CHINA_SANCTIONS_RETALIATION_EVENT,
  NUCLEAR_SMR_OPENING_EVENT,
  PROGRESSIVE_HECKLER_EVENT,
  annualChanceToPerCheckChance,
  generateDynamicEvents,
  getProgressiveHecklingChance,
  isDisasterCheckWeek,
  rollEligibleSpecialEvents,
  shouldTriggerProgressiveHeckling,
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

    expect(Array.isArray(pools.randomPool)).toBe(true);
    expect(Array.isArray(pools.disasterPool)).toBe(true);
    expect(Array.isArray(pools.immediatePool)).toBe(true);
    expect(pools.randomPool.length).toBeGreaterThan(0);

    [...pools.randomPool, ...pools.disasterPool, ...pools.immediatePool].forEach((event) => {
      expect(event.id).toBeTruthy();
      expect(event.name).toBeTruthy();
      expect(event.desc).toBeTruthy();
      expect(Array.isArray(event.choices)).toBe(true);
      expect(event.choices.length).toBeGreaterThan(0);
      expect(event.category).toBeTruthy();
      expect(event.annualChance == null || (event.annualChance > 0 && event.annualChance < 1)).toBe(true);
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

    const specialIds = new Set(pools.randomPool.filter((event) => event.category === "special").map((event) => event.id));
    expect(specialIds.has("liberal_states_refuse")).toBe(true);
    expect(specialIds.has("pentagon_audit_fail")).toBe(true);
    expect(specialIds.has("weed_industry_boom")).toBe(true);
    expect(specialIds.has("anti_israel_protests")).toBe(true);
    expect(specialIds.has("russia_hostage")).toBe(true);
    expect(specialIds.has("corp_profits_surge")).toBe(true);
    expect(specialIds.has("literacy_crisis")).toBe(true);
  });

  it("queues the nuclear reactor opening as an immediate policy consequence after a long delay", () => {
    const earlyPools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      40,
      { nuclear_expansion: 4 },
      []
    );
    const delayedPools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      60,
      { nuclear_expansion: 4 },
      []
    );

    expect(earlyPools.immediatePool.some((event) => event.id === "nuclear_smr_opening")).toBe(false);
    expect(delayedPools.immediatePool.some((event) => event.id === "nuclear_smr_opening")).toBe(true);
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

    expect(pools.randomPool.some((event) => event.id === "corp_profits_surge")).toBe(false);
  });

  it("routes disaster events into a dedicated pool with estimated annual chances", () => {
    const pools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      24,
      {},
      []
    );

    expect(pools.disasterPool.length).toBeGreaterThan(0);
    expect(pools.disasterPool.every((event) => event.isDisaster)).toBe(true);
    expect(pools.disasterPool.every((event) => event.annualChance > 0)).toBe(true);
  });

  it("delays omission-triggered events until year 2", () => {
    const yearOnePools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      52,
      {},
      []
    );
    const yearTwoPools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      53,
      {},
      []
    );

    expect(yearOnePools.randomPool.some((event) => event.id === "detention_conditions")).toBe(false);
    expect(yearOnePools.randomPool.some((event) => event.id === "amtrak_cuts")).toBe(false);
    expect(yearTwoPools.randomPool.some((event) => event.id === "detention_conditions")).toBe(true);
    expect(yearTwoPools.randomPool.some((event) => event.id === "amtrak_cuts")).toBe(true);
  });

  it("keeps the cannabis boom as a one-time event", () => {
    const freshPools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      12,
      { marijuana_fed: 4 },
      []
    );
    const usedPools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(["weed_industry_boom"]),
      "DEM",
      12,
      { marijuana_fed: 4 },
      []
    );

    expect(freshPools.randomPool.some((event) => event.id === "weed_industry_boom" && event.unique)).toBe(true);
    expect(usedPools.randomPool.some((event) => event.id === "weed_industry_boom")).toBe(false);
  });

  it("reduces the cyberattack chance substantially after the cybersecurity EO", () => {
    const baselinePools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      12,
      {},
      []
    );
    const hardenedPools = generateDynamicEvents(
      { ...INITIAL_STATS },
      BASE_STATE_APPROVAL,
      new Set(),
      "DEM",
      12,
      { cybersecurity_strategy: 4 },
      []
    );

    const baselineCyber = baselinePools.randomPool.find((event) => event.id === "cyber");
    const hardenedCyber = hardenedPools.randomPool.find((event) => event.id === "cyber");

    expect(baselineCyber).toBeTruthy();
    expect(hardenedCyber).toBeTruthy();
    expect(hardenedCyber.annualChance).toBeLessThan(baselineCyber.annualChance);
    expect(hardenedCyber.annualChance).toBeCloseTo(baselineCyber.annualChance * 0.1, 6);
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

  it("marks fixed disaster check weeks twice per season window", () => {
    expect(isDisasterCheckWeek(4)).toBe(true);
    expect(isDisasterCheckWeek(18)).toBe(true);
    expect(isDisasterCheckWeek(25)).toBe(true);
    expect(isDisasterCheckWeek(45)).toBe(true);
    expect(isDisasterCheckWeek(5)).toBe(false);
  });

  it("builds the china retaliation event as an immediate crisis event", () => {
    expect(CHINA_SANCTIONS_RETALIATION_EVENT.category).toBe("immediate");
    expect(CHINA_SANCTIONS_RETALIATION_EVENT.choices).toHaveLength(3);
    expect(CHINA_SANCTIONS_RETALIATION_EVENT.macroEffects.investment).toBeLessThan(0);
    expect(CHINA_SANCTIONS_RETALIATION_EVENT.macroEffects.technology).toBeLessThan(0);
  });

  it("builds the SMR opening event as a one-choice immediate policy consequence", () => {
    expect(NUCLEAR_SMR_OPENING_EVENT.category).toBe("immediate");
    expect(NUCLEAR_SMR_OPENING_EVENT.triggeredBy).toBe("Nuclear Expansion & Energy Independence Act");
    expect(NUCLEAR_SMR_OPENING_EVENT.choices).toHaveLength(1);
    expect(NUCLEAR_SMR_OPENING_EVENT.choices[0].effects.powerNuclearShare).toBeGreaterThan(0);
  });

  it("computes progressive heckling chances from faction relationship", () => {
    expect(getProgressiveHecklingChance(35)).toBe(0);
    expect(getProgressiveHecklingChance(25)).toBe(0.10);
    expect(getProgressiveHecklingChance(15)).toBe(0.20);
    expect(getProgressiveHecklingChance(5)).toBe(0.30);
  });

  it("only triggers the progressive heckling event for university visits in solid blue states", () => {
    expect(PROGRESSIVE_HECKLER_EVENT.unique).toBe(true);
    expect(shouldTriggerProgressiveHeckling("university", "CA", 25, new Set(), () => 0.05)).toBe(true);
    expect(shouldTriggerProgressiveHeckling("university", "CA", 25, new Set([PROGRESSIVE_HECKLER_EVENT.id]), () => 0.01)).toBe(false);
    expect(shouldTriggerProgressiveHeckling("university", "TX", 5, new Set(), () => 0.01)).toBe(false);
    expect(shouldTriggerProgressiveHeckling("factory", "CA", 5, new Set(), () => 0.01)).toBe(false);
  });
});
