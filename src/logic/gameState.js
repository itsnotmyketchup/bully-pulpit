export function createInitialCabinetState() {
  return {
    secState: {
      occupantName: null,
      factionId: null,
      party: null,
      startWeek: null,
      candidates: [],
      selectedCandidateId: null,
    },
  };
}

export function createStatHistory(stats) {
  const history = {};
  Object.keys(stats).forEach((key) => {
    history[key] = [stats[key]];
  });
  return history;
}

export function createBudgetDraft(stats) {
  return {
    corporateTaxRate: 0,
    incomeTaxLow: 0,
    incomeTaxMid: 0,
    incomeTaxHigh: 0,
    payrollTaxRate: 0,
    militarySpending: 0,
    educationSpending: 0,
    infrastructureSpending: 0,
    scienceTechnologySpending: 0,
    lawEnforcementSpending: 0,
    agricultureSpending: 0,
    energyEnvironmentSpending: 0,
    irsFunding: 0,
    medicareEligibilityAge: stats.medicareEligibilityAge,
    drugPriceNegotiationLevel: stats.drugPriceNegotiationLevel,
    healthcareSubsidyLevel: stats.healthcareSubsidyLevel,
    childTaxCredit: stats.childTaxCredit,
    earnedIncomeTaxCredit: stats.earnedIncomeTaxCredit,
    saltDeductionCap: stats.saltDeductionCap,
    firstTimeHomebuyerTaxCredit: stats.firstTimeHomebuyerTaxCredit,
    evTaxCredit: stats.evTaxCredit,
    renewableInvestmentTaxCredit: stats.renewableInvestmentTaxCredit,
  };
}
