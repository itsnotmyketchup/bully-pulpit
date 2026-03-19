import { clamp, clampRel, clampUni } from "../utils/clamp.js";

export const clampTrust = (value) => clamp(value, 5, 95);

export function cloneFactions(factions = {}) {
  return Object.fromEntries(
    Object.entries(factions).map(([id, faction]) => [id, { ...faction }])
  );
}

export function adjustFaction(factions, factionId, deltas = {}) {
  if (!factions[factionId]) return factions;
  const faction = factions[factionId];
  factions[factionId] = {
    ...faction,
    relationship: deltas.relationship == null ? faction.relationship : clampRel(faction.relationship + deltas.relationship),
    trust: deltas.trust == null ? faction.trust : clampTrust(faction.trust + deltas.trust),
    unity: deltas.unity == null ? faction.unity : clampUni((faction.unity || 50) + deltas.unity),
  };
  return factions;
}

export function batchAdjustFactions(factions, factionEffects = {}, mapper) {
  Object.entries(factionEffects).forEach(([factionId, value]) => {
    if (!factions[factionId]) return;
    adjustFaction(factions, factionId, mapper(value, factions[factionId], factionId));
  });
  return factions;
}

export function applyRelationshipEffects(factions, factionEffects = {}, scale = 1) {
  return batchAdjustFactions(factions, factionEffects, (value) => ({ relationship: value * scale }));
}

export function applyTrustEffects(factions, factionEffects = {}, scale = 1) {
  return batchAdjustFactions(factions, factionEffects, (value) => ({ trust: value * scale }));
}

export function pushFactionHistory(previousHistory = {}, factions = {}) {
  const nextHistory = { ...previousHistory };
  Object.values(factions).forEach((faction) => {
    nextHistory[faction.id] = {
      trust: [...(previousHistory[faction.id]?.trust || []), faction.trust || 50].slice(-52),
      rel: [...(previousHistory[faction.id]?.rel || []), faction.relationship || 50].slice(-52),
      unity: [...(previousHistory[faction.id]?.unity || []), faction.unity || 50].slice(-52),
    };
  });
  return nextHistory;
}
