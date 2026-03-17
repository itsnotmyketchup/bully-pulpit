export const POLICY_ACTIONS = [
  {
    id: "infra_boost",
    name: "Infrastructure Investment Package",
    desc: "$200B for roads, bridges, and broadband expansion across all 50 states.",
    category: "infrastructure",
    effects: { gdpGrowth: 0.3, nationalDebt: 0.2, infrastructureSpending: 50, unemployment: -0.2 },
    stateEffects: { economy: ["manufacturing"], weight: 0.03 },
    factionReactions: { prog: 0.6, mod_dem: 0.8, blue_dog: 0.4, freedom: -0.7, mod_rep: 0.2, trad_con: -0.3 },
  },
  {
    id: "border",
    name: "Border Security Enhancement Act",
    desc: "Comprehensive border patrol expansion with new surveillance technology.",
    category: "immigration",
    effects: { nationalDebt: 0.05, immigrationRate: -0.2},
    stateEffects: { region: ["south", "west"], weight: 0.02 },
    factionReactions: { prog: -0.6, mod_dem: 0.1, blue_dog: 0.5, freedom: 0.8, mod_rep: 0.6, trad_con: 0.7 },
  },
  {
    id: "abortion_ban",
    name: "National Abortion Ban",
    desc: "Federal prohibition on abortion procedures with limited medical exceptions.",
    category: "social",
    effects: {},
    stateEffects: { region: ["south", "midwest"], weight: 0.03 },
    factionReactions: { prog: -0.95, mod_dem: -0.8, blue_dog: -0.4, freedom: 0.7, mod_rep: 0.5, trad_con: 0.9 },
  },
  {
    id: "abortion_rights",
    name: "National Abortion Rights Act",
    desc: "Federal codification of abortion access through 24 weeks nationwide.",
    category: "social",
    effects: {},
    stateEffects: { region: ["northeast", "west"], weight: 0.03 },
    factionReactions: { prog: 0.95, mod_dem: 0.8, blue_dog: 0.2, freedom: -0.7, mod_rep: -0.5, trad_con: -0.9 },
  },
  {
    id: "defense_mod",
    name: "Defense Modernization Act",
    desc: "$150B investment in next-generation military technology and cyber capabilities.",
    category: "defense",
    effects: { militarySpending: 40, nationalDebt: 0.15 },
    stateEffects: { economy: ["government"], weight: 0.02 },
    factionReactions: { prog: -0.4, mod_dem: 0.2, blue_dog: 0.4, freedom: 0.6, mod_rep: 0.7, trad_con: 0.8 },
  },
  {
    id: "immigration_exp",
    name: "Immigration & Visa Expansion Act",
    desc: "Increase skilled worker visas and streamline the path to citizenship.",
    category: "immigration",
    effects: { gdpGrowth: 0.2, unemployment: -0.1 },
    stateEffects: { economy: ["tech", "finance"], weight: 0.02 },
    factionReactions: { prog: 0.7, mod_dem: 0.6, blue_dog: 0.1, freedom: -0.8, mod_rep: -0.3, trad_con: -0.6 },
  },
  {
    id: "agri_support",
    name: "Agricultural Support Package",
    desc: "Subsidies and crop insurance expansion for family farms and rural communities.",
    category: "agriculture",
    effects: { nationalDebt: 0.08 },
    stateEffects: { farmHeavy: true, weight: 0.04 },
    factionReactions: { prog: 0.2, mod_dem: 0.5, blue_dog: 0.7, freedom: -0.1, mod_rep: 0.4, trad_con: 0.5 },
  },
  {
    id: "crime_bill",
    name: "Safe Streets & Justice Act",
    desc: "Increased federal funding for law enforcement and mandatory minimums for violent offenders.",
    category: "crime",
    effects: { crimeRate: -0.4, nationalDebt: 0.06 },
    stateEffects: { region: ["south", "midwest"], weight: 0.02 },
    factionReactions: { prog: -0.7, mod_dem: -0.2, blue_dog: 0.5, freedom: 0.5, mod_rep: 0.7, trad_con: 0.8 },
  },
  {
    id: "marijuana_fed",
    name: "Federal Marijuana Legalization Act",
    desc: "Removes marijuana from the federal controlled substances list and expunges prior convictions.",
    category: "social",
    effects: { gdpGrowth: 0.05, crimeRate: -0.1 },
    stateEffects: { region: ["west", "northeast"], weight: 0.025 },
    factionReactions: { prog: 0.8, mod_dem: 0.6, blue_dog: -0.1, freedom: 0.3, mod_rep: -0.2, trad_con: -0.7 },
  },
];

export const BILL_STAGES = [
  { id: "committee", label: "Committee", desc: "Under committee consideration" },
  { id: "first_chamber", label: "1st Chamber", desc: "Passed first chamber vote" },
  { id: "second_chamber", label: "2nd Chamber", desc: "Passed second chamber vote" },
  { id: "reconciliation", label: "Reconciliation", desc: "Resolving differences" },
];

export const POLICY_CATEGORIES = ["all", "infrastructure", "immigration", "social", "defense", "agriculture", "crime"];

export const BILL_LOCKS = {
  abortion_ban: ["abortion_rights"],
  abortion_rights: ["abortion_ban"],
  border: ["immigration_exp"],
  immigration_exp: ["border"],
  crime_bill: [],
  marijuana_fed: [],
};

export const BILL_AMENDMENTS = {
  border: [
    {
      id: "border_pathway",
      label: "Add pathway to citizenship",
      desc: "Include a limited legalization pathway for long-term residents, gaining moderate Democratic support.",
      factionMod: { prog: 0.2, mod_dem: 0.15, blue_dog: 0.05, freedom: -0.1 },
    },
    {
      id: "border_civil_lib",
      label: "Add civil liberties protections",
      desc: "Include explicit due-process protections for all detainees, softening progressive opposition.",
      factionMod: { prog: 0.25, mod_dem: 0.1, freedom: -0.05 },
    },
  ],
  infra_boost: [
    {
      id: "infra_tax_offset",
      label: "Offset with discretionary cuts",
      desc: "Partially offset infrastructure costs with discretionary spending reductions, reducing fiscal concerns.",
      factionMod: { freedom: 0.2, mod_rep: 0.15, trad_con: 0.1 },
    },
    {
      id: "infra_private_match",
      label: "Add private investment matching",
      desc: "Require 25% private sector co-investment for major projects, increasing conservative appeal.",
      factionMod: { freedom: 0.15, mod_rep: 0.2, trad_con: 0.05 },
    },
  ],
  crime_bill: [
    {
      id: "crime_reform",
      label: "Add rehabilitation funding",
      desc: "Include prison rehabilitation and reentry programs alongside enforcement measures.",
      factionMod: { prog: 0.2, mod_dem: 0.15 },
    },
    {
      id: "crime_body_cam",
      label: "Require federal officer body cameras",
      desc: "Mandate body cameras for all federally-funded law enforcement officers.",
      factionMod: { prog: 0.15, mod_dem: 0.1, blue_dog: 0.05 },
    },
  ],
  immigration_exp: [
    {
      id: "immig_merit",
      label: "Limit to merit-based visas only",
      desc: "Restrict expansion to high-skill and STEM workers only.",
      factionMod: { freedom: 0.2, mod_rep: 0.15, trad_con: 0.1 },
    },
    {
      id: "immig_border_secure",
      label: "Include border security provisions",
      desc: "Pair visa expansion with enhanced border security measures.",
      factionMod: { blue_dog: 0.15, mod_rep: 0.1, freedom: 0.05 },
    },
  ],
  marijuana_fed: [
    {
      id: "mj_expunge_only",
      label: "Limit to expungements only",
      desc: "Remove full federal legalization — only expunge prior convictions, reducing social conservative opposition.",
      factionMod: { trad_con: 0.3, mod_rep: 0.25, freedom: 0.1 },
    },
    {
      id: "mj_state_opt_out",
      label: "Allow state opt-out",
      desc: "Let states opt out of federal legalization, preserving conservative states' prerogative.",
      factionMod: { trad_con: 0.25, mod_rep: 0.2, blue_dog: 0.1 },
    },
  ],
};
