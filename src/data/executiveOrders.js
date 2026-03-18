// controversy: 1 = low, 2 = moderate, 3 = high
// factionReactions: keyed by faction id, values are multipliers on an 8-point rel scale
// stateEffects: various filter types for which states get approval boosts
// requiresChoice: needs extra data before issuing (country picker or sub-choice)

export const DEFAULT_REFUGEE_CAP = 70000;
export const MIN_REFUGEE_CAP = 7500;
export const MAX_REFUGEE_CAP = 125000;

export const DRILLING_REGION_OPTIONS = [
  { id: "gulf", label: "Gulf of Mexico" },
  { id: "bering", label: "Bering Sea" },
  { id: "atlantic", label: "Atlantic Coast" },
  { id: "pacific", label: "Pacific Coast" },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function getRefugeeCapConfig(rawCap) {
  const cap = clamp(Number(rawCap) || DEFAULT_REFUGEE_CAP, MIN_REFUGEE_CAP, MAX_REFUGEE_CAP);
  const mood = (cap - DEFAULT_REFUGEE_CAP) / (DEFAULT_REFUGEE_CAP - MIN_REFUGEE_CAP);

  return {
    cap,
    effects: { immigrationRate: Number((mood * 0.05).toFixed(3)) },
    macroEffects: { labor: Number((-mood * 0.03).toFixed(3)), confidence: Number((mood * 0.02).toFixed(3)) },
    factionReactions: {
      freedom: Number((-0.55 * mood).toFixed(3)),
      trad_con: Number((-0.45 * mood).toFixed(3)),
      mod_rep: Number((-0.22 * mood).toFixed(3)),
      blue_dog: Number((0.12 * mood).toFixed(3)),
      mod_dem: Number((0.32 * mood).toFixed(3)),
      prog: Number((0.62 * mood).toFixed(3)),
    },
  };
}

export function getDrillingPermitsConfig(rawRegions = []) {
  const selectedRegions = DRILLING_REGION_OPTIONS
    .map(option => option.id)
    .filter((id, index, arr) => rawRegions.includes(id) && arr.indexOf(id) === index);

  return {
    selectedRegions,
    delayedEffects: selectedRegions.length > 0
      ? { weeks: 52, effects: { gasPrice: Number((-0.06 * selectedRegions.length).toFixed(3)) } }
      : null,
    delayedMacroEffects: selectedRegions.length > 0
      ? { weeks: 52, effects: { investment: Number((0.03 * selectedRegions.length).toFixed(3)) } }
      : null,
    stateEffects: {
      drillingRegions: selectedRegions,
      weight: 0.015,
    },
  };
}

export function buildExecutiveOrderOutcome(order, extraData = {}) {
  if (!order) return null;

  const outcome = {
    effects: { ...(order.effects || {}) },
    macroEffects: { ...(order.macroEffects || {}) },
    delayedEffects: order.delayedEffects
      ? {
          weeks: order.delayedEffects.weeks,
          effects: { ...(order.delayedEffects.effects || {}) },
        }
      : null,
    delayedMacroEffects: order.delayedMacroEffects
      ? {
          weeks: order.delayedMacroEffects.weeks,
          effects: { ...(order.delayedMacroEffects.effects || {}) },
        }
      : null,
    factionReactions: { ...(extraData.factionOverride || order.factionReactions || {}) },
    stateEffects: order.stateEffects ? { ...order.stateEffects } : null,
  };

  if (order.id === "refugee_cap") {
    const config = getRefugeeCapConfig(extraData.refugeeCap);
    outcome.effects = config.effects;
    outcome.macroEffects = config.macroEffects;
    outcome.factionReactions = config.factionReactions;
    outcome.meta = { refugeeCap: config.cap };
  }

  if (order.id === "drilling_permits") {
    const config = getDrillingPermitsConfig(extraData.drillingRegions);
    outcome.delayedEffects = config.delayedEffects;
    outcome.delayedMacroEffects = config.delayedMacroEffects;
    outcome.stateEffects = config.stateEffects;
    outcome.meta = { drillingRegions: config.selectedRegions };
  }

  return outcome;
}

export const EXECUTIVE_ORDERS = [
  {
    id: "hiring_freeze",
    name: "Federal Hiring Freeze",
    desc: "Freeze all non-essential federal civilian hiring. Curbs government growth and marginally reduces the deficit, but depresses morale in government-heavy states.",
    category: "Fiscal",
    controversy: 1,
    repeatable: false,
    reversible: true,
    effects: { nationalDebt: -0.02 },
    approvalEffect: 0,
    factionReactions: { freedom: 0.5, trad_con: 0.3, mod_rep: 0.15, blue_dog: 0.1, mod_dem: -0.2, prog: -0.4 },
    stateEffects: { economy: ["government"], weight: -0.015 },
  },
  {
    id: "refugee_cap",
    name: "Refugee Cap Adjustment",
    desc: "Set the annual refugee admissions ceiling. Lower caps marginally reduce overall immigration and reassure restrictionists; higher caps improve humanitarian standing but trigger backlash from immigration hawks.",
    category: "Immigration",
    controversy: 2,
    repeatable: true,
    reversible: false,
    effects: {},
    approvalEffect: 0,
    factionReactions: {},
    stateEffects: null,
    requiresChoice: true,
    choiceType: "refugee_cap",
  },
  {
    id: "immigration_enforcement",
    name: "Immigration Enforcement Directive",
    desc: "Direct federal agencies to increase interior enforcement, deportation operations, and workplace raids. Sharply reduces undocumented immigration but inflames civil liberties debates.",
    category: "Immigration",
    controversy: 2,
    repeatable: true,
    reversible: false,
    effects: { immigrationRate: -0.12 },
    approvalEffect: 0,
    factionReactions: { freedom: 0.6, trad_con: 0.5, mod_rep: 0.2, blue_dog: 0.15, mod_dem: -0.3, prog: -0.8 },
    stateEffects: { border: true, weight: 0.03 },
  },
  {
    id: "epa_rollback",
    name: "Environmental Regulation Rollback",
    desc: "Suspend pending EPA emissions rules. Lowers near-term energy costs and boosts manufacturing and energy states, but draws fierce opposition from environmentalists.",
    category: "Environment",
    controversy: 2,
    repeatable: false,
    reversible: true,
    effects: { gasPrice: -0.15 },
    approvalEffect: 0,
    factionReactions: { freedom: 1, trad_con: 0.5, mod_rep: 0.3, blue_dog: -0.5, mod_dem: -1, prog: -2 },
    stateEffects: { economy: ["energy", "manufacturing"], weight: 0.02 },
  },
  {
    id: "student_loan_pause",
    name: "Student Loan Payment Pause",
    desc: "Extend a 6-month forbearance on all federal student loan payments. Relief for tens of millions of borrowers, but adds to the national debt.",
    category: "Education",
    controversy: 1,
    repeatable: true,
    reversible: false,
    effects: { nationalDebt: 0.03 },
    approvalEffect: 1,
    factionReactions: { prog: 0.6, mod_dem: 0.3, blue_dog: -0.2, freedom: -0.4, trad_con: -0.3, mod_rep: -0.2 },
    stateEffects: { minEducation: 0.65, weight: 0.02 },
  },
  {
    id: "federal_min_wage",
    name: "Federal Worker Minimum Wage Increase",
    desc: "Raise the minimum wage for federal employees and contractors. Improves worker pay and generates goodwill, but adds to the deficit and irritates fiscal conservatives.",
    category: "Labor",
    controversy: 2,
    repeatable: false,
    reversible: true,
    effects: { nationalDebt: 0.02, approvalRating: 1 },
    approvalEffect: 1,
    factionReactions: { prog: 0.5, mod_dem: 0.3, blue_dog: 0.1, freedom: -0.5, trad_con: -0.3, mod_rep: -0.2 },
    stateEffects: { minUrbanization: 0.8, weight: 0.02 },
  },
  {
    id: "buy_american",
    name: "Tighten Buy American Rules",
    desc: "Tighten domestic-content requirements for federal procurement. Slightly narrows the trade deficit and helps industrial supply chains, but modestly drags on near-term growth through higher input costs.",
    category: "Trade",
    controversy: 1,
    repeatable: false,
    reversible: true,
    effects: { tradeBalance: 1.8 },
    macroEffects: { nx: 0.08, investment: -0.05 },
    approvalEffect: 0,
    factionReactions: { blue_dog: 0.2, mod_rep: 0.18, trad_con: 0.1, mod_dem: 0.12, prog: 0.08, freedom: -0.08 },
    stateEffects: { economy: ["manufacturing"], weight: 0.015 },
  },
  {
    id: "sanctions",
    name: "Economic Sanctions",
    desc: "Impose targeted economic and political sanctions on a hostile or adversarial nation. Big diplomatic signal — draws hawkish support but may provoke retaliation.",
    category: "Foreign Policy",
    controversy: 1,
    repeatable: true,
    reversible: false,
    effects: {},
    approvalEffect: 1,
    factionReactions: { trad_con: 0.3, freedom: 0.3, mod_rep: 0.25, blue_dog: 0.1, mod_dem: -0.1, prog: -0.2 },
    stateEffects: null,
    requiresChoice: true,
    choiceType: "country",
  },
  {
    id: "border_emergency",
    name: "Emergency Border Declaration",
    desc: "Declare a national emergency at the southern border, redirecting military appropriations to barrier construction and enforcement surge. Highly controversial.",
    category: "Immigration",
    controversy: 3,
    repeatable: false,
    reversible: true,
    effects: { immigrationRate: -0.25 },
    approvalEffect: 0,
    factionReactions: { freedom: 0.7, trad_con: 0.5, mod_rep: 0.3, blue_dog: 0.2, mod_dem: -0.4, prog: -0.9 },
    stateEffects: { border: true, weight: 0.05 },
  },
  {
    id: "tariffs",
    name: "Emergency Import Tariffs",
    desc: "Impose emergency tariffs on foreign goods to protect domestic industry. Boosts manufacturing states but raises consumer prices and strains foreign relationships.",
    category: "Trade",
    controversy: 3,
    repeatable: true,
    reversible: true,
    effects: { tradeBalance: 2, gasPrice: 0.08 },
    macroEffects: { nx: 0.1, price: 0.12, investment: -0.04 },
    approvalEffect: 0,
    factionReactions: { mod_rep: 0.15, trad_con: 0.2, blue_dog: 0.2, freedom: -0.3, mod_dem: -0.2, prog: -0.1 },
    stateEffects: { economy: ["manufacturing"], weight: 0.025 },
    countryEffect: { relationship: -5, targetAll: true },
  },
  {
    id: "drilling_permits",
    name: "Federal Lands Drilling Permits",
    desc: "Open federal lands and offshore zones to expanded oil and gas exploration. Pick where to expand leasing; each region adds delayed price relief over the next year, but environmental backlash lands immediately.",
    category: "Energy",
    controversy: 2,
    repeatable: false,
    reversible: true,
    effects: {},
    approvalEffect: 0,
    factionReactions: { freedom: 0.5, trad_con: 0.3, mod_rep: 0.3, blue_dog: -0.1, mod_dem: -0.2, prog: -0.7 },
    stateEffects: null,
    requiresChoice: true,
    choiceType: "drilling_regions",
  },
  {
    id: "cybersecurity_strategy",
    name: "National Cyber Security Strategy",
    desc: "Direct agencies to harden federal networks, coordinate with the private sector, and expand cyber preparedness standards. Broadly bipartisan, low-drama, and effective at reducing major breach risk.",
    category: "Security",
    controversy: 1,
    repeatable: false,
    reversible: true,
    effects: {},
    approvalEffect: 0,
    factionReactions: { mod_rep: 0.18, mod_dem: 0.18, blue_dog: 0.15, trad_con: 0.12, prog: 0.12, freedom: 0.05 },
    stateEffects: null,
  },
  {
    id: "declassification",
    name: "Declassification Directive",
    desc: "Order the release of previously classified government documents. A political play that generates media coverage and has significant — but variable — faction effects depending on what is released.",
    category: "Transparency",
    controversy: 1,
    repeatable: false,
    reversible: false,
    effects: { approvalRating: 1 },
    approvalEffect: 1,
    factionReactions: { prog: 0.2, mod_dem: 0.1, blue_dog: 0.1, freedom: 0.2, trad_con: -0.1, mod_rep: 0.1 },
    stateEffects: null,
    requiresChoice: true,
    choiceType: "declassify",
    choices: [
      {
        id: "intelligence_failures",
        label: "Intelligence community failures",
        desc: "Expose past failures, overreach, and abuses within federal intelligence agencies.",
        factionOverride: { prog: 0.5, mod_dem: 0.2, freedom: 0.4, blue_dog: 0.1, trad_con: -0.2, mod_rep: -0.1 },
      },
      {
        id: "lobbying_records",
        label: "Corporate lobbying records",
        desc: "Release records documenting how corporations shaped federal policy and legislation.",
        factionOverride: { prog: 0.6, mod_dem: 0.3, blue_dog: 0.2, freedom: -0.4, trad_con: -0.2, mod_rep: -0.3 },
      },
      {
        id: "military_operations",
        label: "Classified military operations",
        desc: "Declassify documents on controversial covert military programs and operations.",
        factionOverride: { prog: 0.3, mod_dem: 0.1, trad_con: 0.15, freedom: 0.25, mod_rep: -0.1, blue_dog: -0.1 },
      },
    ],
  },
];
