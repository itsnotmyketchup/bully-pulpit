export function canStartBudgetReconciliation({ act = 0, maxActions = 4, activeBills = [], reconciliationCooldown = 0, week = 1 }) {
  const hasActionCapacity = act + 2 <= maxActions;
  const hasBillCapacity = activeBills.length < 2;
  const cooldownReady = reconciliationCooldown === 0 || week >= reconciliationCooldown;

  return hasActionCapacity && hasBillCapacity && cooldownReady;
}
