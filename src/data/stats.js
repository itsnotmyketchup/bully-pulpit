export const INITIAL_STATS = {
  gdpGrowth: 2.2,
  realGdpGrowth: 2.2,
  potentialGdpGrowth: 2.1,
  outputGap: 0,
  nominalGdp: 28.0,         // nominal GDP in $T
  unemployment: 4.4,
  inflation: 2.9,
  nationalDebt: 36.2,
  nationalDeficit: 1820,    // annual deficit in $B (~$1.8T realistic)
  taxRevenue: 6326,
  fedFundsRate: 4.5,
  housingStarts: 1366900,
  approvalRating: 54,
  population: 345426571,    // total US population
  birthRate: 10.8,          // births per 1,000 people per year
  deathRate: 9.2,           // deaths per 1,000 people per year
  crimeRate: 4.8,
  gasPrice: 3.45,
  immigrationRate: 1.1,
  tradeBalance: -67.4,
  militarySpending: 886,
  educationSpending: 102,
  healthcareSpending: 1520,
  socialSecuritySpending: 1490,
  infrastructureSpending: 110,
  otherSpending: 169,
  scienceTechnologySpending: 45,
  lawEnforcementSpending: 58,
  agricultureSpending: 31,
  energyEnvironmentSpending: 35,
  corporateTaxRate: 21,     // %
  incomeTaxLow: 10,         // % on income < $50k
  incomeTaxMid: 22,         // % on income $50k–$200k
  incomeTaxHigh: 37,        // % on income > $200k
  payrollTaxRate: 7.65,     // %
};

export const SM = {
  gdpGrowth:          { l: "GDP growth",         g: "up",      f: v => v.toFixed(1) + "%" },
  realGdpGrowth:      { l: "Real GDP growth",    g: "up",      f: v => v.toFixed(1) + "%" },
  potentialGdpGrowth: { l: "Potential growth",   g: "up",      f: v => v.toFixed(1) + "%" },
  outputGap:          { l: "Output gap",         g: "up",      f: v => v.toFixed(1) + "%" },
  nominalGdp:         { l: "Nominal GDP",        g: "up",      f: v => "$" + v.toFixed(2) + "T" },
  unemployment:       { l: "Unemployment",       g: "down",    f: v => v.toFixed(1) + "%" },
  inflation:          { l: "Inflation",           g: "down",    f: v => v.toFixed(1) + "%" },
  nationalDebt:       { l: "National debt",      g: "down",    f: v => "$" + v.toFixed(1) + "T" },
  nationalDeficit:    { l: "Annual deficit",     g: "down",    f: v => v >= 0 ? "$" + Math.round(v) + "B deficit" : "$" + Math.abs(Math.round(v)) + "B surplus" },
  taxRevenue:         { l: "Tax revenue",        g: "up",      f: v => "$" + Math.round(v) + "B" },
  fedFundsRate:       { l: "Fed funds rate",     g: "down",    f: v => v.toFixed(2) + "%" },
  housingStarts:      { l: "Housing starts",     g: "up",      f: v => Math.round(v).toLocaleString() },
  approvalRating:     { l: "Approval",           g: "up",      f: v => Math.round(v) + "%" },
  population:         { l: "Population",          g: "up",      f: v => (v / 1e6).toFixed(2) + "M" },
  birthRate:          { l: "Birth rate",          g: "neutral", f: v => v.toFixed(1) + "/1k" },
  deathRate:          { l: "Death rate",          g: "down",    f: v => v.toFixed(1) + "/1k" },
  crimeRate:          { l: "Crime rate",          g: "down",    f: v => v.toFixed(1) + "/100k" },
  gasPrice:           { l: "Gas price",           g: "down",    f: v => "$" + v.toFixed(2) },
  immigrationRate:    { l: "Immigration",        g: "neutral", f: v => v.toFixed(2) + "M/yr" },
  tradeBalance:       { l: "Trade balance",      g: "up",      f: v => (v >= 0 ? "+" : "") + v.toFixed(1) + "B" },
  militarySpending:   { l: "Defense",            g: "neutral", f: v => "$" + Math.round(v) + "B" },
  educationSpending:  { l: "Education",          g: "neutral", f: v => "$" + Math.round(v) + "B" },
  healthcareSpending: { l: "Healthcare",         g: "neutral", f: v => "$" + Math.round(v) + "B" },
  socialSecuritySpending: { l: "Social Security", g: "neutral", f: v => "$" + Math.round(v) + "B" },
  infrastructureSpending: { l: "Infrastructure", g: "neutral", f: v => "$" + Math.round(v) + "B" },
  otherSpending:      { l: "Other",              g: "neutral", f: v => "$" + Math.round(v) + "B" },
  scienceTechnologySpending: { l: "Science & Technology", g: "neutral", f: v => "$" + Math.round(v) + "B" },
  lawEnforcementSpending: { l: "Law Enforcement", g: "neutral", f: v => "$" + Math.round(v) + "B" },
  agricultureSpending: { l: "Agriculture", g: "neutral", f: v => "$" + Math.round(v) + "B" },
  energyEnvironmentSpending: { l: "Energy & Environment", g: "neutral", f: v => "$" + Math.round(v) + "B" },
  corporateTaxRate:   { l: "Corporate tax",      g: "neutral", f: v => v.toFixed(0) + "%" },
  incomeTaxLow:       { l: "Income tax <$50k",   g: "neutral", f: v => v.toFixed(0) + "%" },
  incomeTaxMid:       { l: "Income tax <$200k",  g: "neutral", f: v => v.toFixed(0) + "%" },
  incomeTaxHigh:      { l: "Income tax >$200k",  g: "neutral", f: v => v.toFixed(0) + "%" },
  payrollTaxRate:     { l: "Payroll tax",        g: "neutral", f: v => v.toFixed(2) + "%" },
};
