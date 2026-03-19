import {
  adaptLegacyEffectsToMacroImpulses,
  applyMacroEffects,
  deriveVisibleStats,
} from "./macroEconomy.js";

export function syncDerivedStats(baseStats, nextMacroState) {
  return deriveVisibleStats(baseStats, nextMacroState);
}

export function applyEffectsBundle(currentStats, currentMacroState, effects = {}, sourceMeta = {}, mult = 1) {
  let nextStats = { ...currentStats };
  let nextMacroState = applyMacroEffects(currentMacroState, sourceMeta.macroEffects || {}, mult);
  nextMacroState = adaptLegacyEffectsToMacroImpulses(nextMacroState, effects, sourceMeta, mult);

  Object.entries(effects || {}).forEach(([key, rawValue]) => {
    const value = rawValue * mult;
    if (["gdpGrowth", "unemployment", "inflation"].includes(key)) return;
    if (nextStats[key] !== undefined) nextStats[key] += value;
  });

  nextStats = syncDerivedStats(nextStats, nextMacroState);
  return { stats: nextStats, macroState: nextMacroState };
}

export function applyStateActionEffects(stateBonuses, action, stateData, drillingRegionStateMap = {}) {
  const nextBonuses = { ...stateBonuses };
  const stateEffects = action?.stateEffects;
  if (!stateEffects) return nextBonuses;

  stateData.forEach((state) => {
    let hit = false;
    if (stateEffects.farmHeavy && state.farm > 0.15) hit = true;
    if (stateEffects.border && state.border) hit = true;
    if (stateEffects.economy && stateEffects.economy.includes(state.economy)) hit = true;
    if (stateEffects.region && stateEffects.region.includes(state.region)) hit = true;
    if (stateEffects.minUrbanization && (state.urbanization || 0) >= stateEffects.minUrbanization) hit = true;
    if (stateEffects.maxUrbanization && (state.urbanization || 1) <= stateEffects.maxUrbanization) hit = true;
    if (stateEffects.minEducation && (state.education || 0) >= stateEffects.minEducation) hit = true;
    if (stateEffects.stateAbbrs && stateEffects.stateAbbrs.includes(state.abbr)) hit = true;
    if (stateEffects.drillingRegions?.length) {
      const drillingHit = stateEffects.drillingRegions.some((regionId) => {
        const targets = drillingRegionStateMap[regionId] || [];
        return targets.includes(state.abbr) && state.economy === "energy";
      });
      if (drillingHit) hit = true;
    }

    if (hit) {
      nextBonuses[state.abbr] = (nextBonuses[state.abbr] || 0) + (stateEffects.weight || 0.02);
    }
  });

  return nextBonuses;
}
