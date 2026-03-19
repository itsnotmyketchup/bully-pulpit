import { SM } from "../data/stats.js";

const HIDDEN_LEGACY_KEYS = new Set(["gdpGrowth", "unemployment", "inflation"]);

const MACRO_LABELS = {
  demand: "Demand",
  investment: "Investment",
  price: "Inflation Pressure",
  labor: "Labor Market",
  technology: "Technology",
  productivity: "Productivity",
  confidence: "Confidence",
  consumerConfidence: "Consumer Confidence",
  businessConfidence: "Business Confidence",
  nx: "Net Exports",
  educationQuality: "Education Quality",
  infrastructureQuality: "Infrastructure Quality",
  technologicalAdvancement: "Tech Advancement",
};

function formatDirectValue(value) {
  if (typeof value !== "number") return String(value);
  if (Math.abs(value) < 1) return `${value > 0 ? "+" : ""}${value.toFixed(2).replace(/\.?0+$/, "")}`;
  return `${value > 0 ? "+" : ""}${Number(value.toFixed(2)).toLocaleString()}`;
}

function macroMagnitude(value) {
  const abs = Math.abs(value);
  if (abs < 0.08) return "Slight";
  if (abs < 0.18) return "Moderate";
  if (abs < 0.35) return "Strong";
  return "Major";
}

function formatMacroText(value) {
  return `${macroMagnitude(value)} ${value > 0 ? "boost" : "drag"}`;
}

export function buildEffectPreview(source = {}) {
  const items = [];

  Object.entries(source.effects || {}).forEach(([key, value]) => {
    if (!value || HIDDEN_LEGACY_KEYS.has(key)) return;
    const meta = SM[key];
    const positive = meta ? ((meta.g === "up" && value > 0) || (meta.g === "down" && value < 0)) : value > 0;
    items.push({
      id: `effect_${key}`,
      label: meta?.l || key,
      valueText: formatDirectValue(value),
      positive,
      delayed: false,
      isMacro: false,
    });
  });

  Object.entries(source.macroEffects || {}).forEach(([key, value]) => {
    if (!value) return;
    items.push({
      id: `macro_${key}`,
      label: MACRO_LABELS[key] || key,
      valueText: formatMacroText(value),
      positive: value > 0,
      delayed: false,
      isMacro: true,
    });
  });

  if (source.delayedEffects) {
    Object.entries(source.delayedEffects.effects || {}).forEach(([key, value]) => {
      if (!value || HIDDEN_LEGACY_KEYS.has(key)) return;
      const meta = SM[key];
      const positive = meta ? ((meta.g === "up" && value > 0) || (meta.g === "down" && value < 0)) : value > 0;
      items.push({
        id: `delayed_effect_${key}`,
        label: meta?.l || key,
        valueText: `${formatDirectValue(value)} in ${source.delayedEffects.weeks}w`,
        positive,
        delayed: true,
        isMacro: false,
      });
    });
  }

  if (source.delayedMacroEffects) {
    Object.entries(source.delayedMacroEffects.effects || {}).forEach(([key, value]) => {
      if (!value) return;
      items.push({
        id: `delayed_macro_${key}`,
        label: MACRO_LABELS[key] || key,
        valueText: `${formatMacroText(value)} in ${source.delayedMacroEffects.weeks}w`,
        positive: value > 0,
        delayed: true,
        isMacro: true,
      });
    });
  }

  (source.specialEffects || []).forEach((effect) => {
    if (!effect?.id || !effect?.label || !effect?.valueText) return;
    items.push({
      id: `special_${effect.id}`,
      label: effect.label,
      valueText: effect.valueText,
      positive: effect.positive !== false,
      delayed: false,
      isMacro: false,
    });
  });

  return items;
}
