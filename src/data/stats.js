export const INITIAL_STATS = {
  gdpGrowth: 2.2,
  nominalGdp: 28.0,         // nominal GDP in $T
  unemployment: 4.4,
  inflation: 2.9,
  nationalDebt: 36.2,
  nationalDeficit: 1820,    // annual deficit in $B (~$1.8T realistic)
  approvalRating: 52,
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
  infrastructureSpending: 110,
  corporateTaxRate: 21,     // %
  incomeTaxLow: 10,         // % on income < $50k
  incomeTaxMid: 22,         // % on income $50k–$200k
  incomeTaxHigh: 37,        // % on income > $200k
  payrollTaxRate: 7.65,     // %
};

export const SM = {
  gdpGrowth:          { l: "GDP growth",         g: "up",      f: v => v.toFixed(1) + "%" },
  nominalGdp:         { l: "Nominal GDP",        g: "up",      f: v => "$" + v.toFixed(2) + "T" },
  unemployment:       { l: "Unemployment",       g: "down",    f: v => v.toFixed(1) + "%" },
  inflation:          { l: "Inflation",           g: "down",    f: v => v.toFixed(1) + "%" },
  nationalDebt:       { l: "National debt",      g: "down",    f: v => "$" + v.toFixed(1) + "T" },
  nationalDeficit:    { l: "Annual deficit",     g: "down",    f: v => v >= 0 ? "$" + Math.round(v) + "B deficit" : "$" + Math.abs(Math.round(v)) + "B surplus" },
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
  infrastructureSpending: { l: "Infrastructure", g: "neutral", f: v => "$" + Math.round(v) + "B" },
  corporateTaxRate:   { l: "Corporate tax",      g: "neutral", f: v => v.toFixed(0) + "%" },
  incomeTaxLow:       { l: "Income tax <$50k",   g: "neutral", f: v => v.toFixed(0) + "%" },
  incomeTaxMid:       { l: "Income tax <$200k",  g: "neutral", f: v => v.toFixed(0) + "%" },
  incomeTaxHigh:      { l: "Income tax >$200k",  g: "neutral", f: v => v.toFixed(0) + "%" },
  payrollTaxRate:     { l: "Payroll tax",        g: "neutral", f: v => v.toFixed(2) + "%" },
};
