import { clampRel } from "../utils/clamp.js";
import { clampTrust } from "./factionMutations.js";

export function getPromiseLabel(promise) {
  if (!promise) return "";
  if (promise.type === "cabinet") return `appoint Secretary of State from ${promise.promisedFactionName}`;
  return `pass "${promise.billName}"`;
}

export function settleSecStatePromises(promises, factionsSnapshot, confirmedFactionId, occupantName) {
  const nextFactions = { ...factionsSnapshot };
  const remainingPromises = [];
  const broken = [];
  const logs = [];

  promises.forEach((promise) => {
    if (promise.type !== "cabinet" || promise.officeId !== "sec_state") {
      remainingPromises.push(promise);
      return;
    }

    if (promise.promisedFactionId === confirmedFactionId) {
      if (nextFactions[promise.factionId]) {
        nextFactions[promise.factionId] = {
          ...nextFactions[promise.factionId],
          trust: clampTrust(nextFactions[promise.factionId].trust + (promise.successTrustBoost || 8)),
        };
      }
      logs.push(`Promise kept: ${occupantName} gave ${promise.promisedFactionName} Secretary of State. Trust +${promise.successTrustBoost || 8}.`);
      return;
    }

    if (nextFactions[promise.factionId]) {
      nextFactions[promise.factionId] = {
        ...nextFactions[promise.factionId],
        relationship: clampRel(nextFactions[promise.factionId].relationship - (promise.betrayalRelPenalty || 18)),
        trust: clampTrust(nextFactions[promise.factionId].trust - (promise.betrayalTrustPenalty || 35)),
      };
    }
    logs.push(`Broken promise: ${promise.promisedFactionName} was promised Secretary of State, but ${occupantName} came from another faction.`);
    broken.push({
      factionName: nextFactions[promise.factionId]?.name || promise.promisedFactionName,
      promiseLabel: getPromiseLabel(promise),
      relationshipLoss: promise.betrayalRelPenalty || 18,
      trustLoss: promise.betrayalTrustPenalty || 35,
    });
  });

  return { nextFactions, remainingPromises, broken, logs };
}
