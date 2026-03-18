import { describe, expect, it } from "vitest";

import { EXECUTIVE_ORDERS } from "../executiveOrders.js";
import { FACTION_DATA } from "../factions.js";
import { POLICY_ACTIONS, BILL_AMENDMENTS } from "../policies.js";
import { INITIAL_STATS } from "../stats.js";

const factionIds = new Set(
  Object.values(FACTION_DATA).flat().map((faction) => faction.id)
);

const statKeys = new Set(Object.keys(INITIAL_STATS));

describe("policy data integrity", () => {
  it("gives every bill the required core fields", () => {
    POLICY_ACTIONS.forEach((bill) => {
      expect(bill.id).toBeTruthy();
      expect(bill.name).toBeTruthy();
      expect(bill.desc).toBeTruthy();
      expect(bill.category).toBeTruthy();
      expect(typeof bill.factionReactions).toBe("object");
    });
  });

  it("only uses known factions in bill reactions and amendments", () => {
    POLICY_ACTIONS.forEach((bill) => {
      Object.keys(bill.factionReactions || {}).forEach((factionId) => {
        expect(factionIds.has(factionId)).toBe(true);
      });
    });

    Object.entries(BILL_AMENDMENTS).forEach(([billId, amendments]) => {
      expect(POLICY_ACTIONS.some((bill) => bill.id === billId)).toBe(true);
      amendments.forEach((amendment) => {
        Object.keys(amendment.factionMod || {}).forEach((factionId) => {
          expect(factionIds.has(factionId)).toBe(true);
        });
      });
    });
  });

  it("only uses known stat keys in bill effects", () => {
    POLICY_ACTIONS.forEach((bill) => {
      Object.keys(bill.effects || {}).forEach((effectKey) => {
        expect(statKeys.has(effectKey)).toBe(true);
      });
    });
  });
});

describe("executive order data integrity", () => {
  it("only uses known factions and stat keys", () => {
    EXECUTIVE_ORDERS.forEach((order) => {
      Object.keys(order.factionReactions || {}).forEach((factionId) => {
        expect(factionIds.has(factionId)).toBe(true);
      });

      Object.keys(order.effects || {}).forEach((effectKey) => {
        expect(statKeys.has(effectKey)).toBe(true);
      });

      Object.keys(order.delayedEffects?.effects || {}).forEach((effectKey) => {
        expect(statKeys.has(effectKey)).toBe(true);
      });
    });
  });

  it("defines choice metadata consistently for choice-based orders", () => {
    EXECUTIVE_ORDERS.forEach((order) => {
      if (!order.requiresChoice) return;

      expect(order.choiceType).toBeTruthy();

      if (order.choiceType === "declassify") {
        expect(Array.isArray(order.choices)).toBe(true);
        expect(order.choices.length).toBeGreaterThan(0);
      }
    });
  });
});
