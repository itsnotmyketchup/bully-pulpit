import { clampRel } from "../utils/clamp.js";

export const HONEYMOON_START_APPROVAL = 54;
export const HONEYMOON_TARGET_APPROVAL = 40;
export const HONEYMOON_WEEKS = 6;

export function computeApprovalTarget(stats, playerParty) {
  const structuralBase = playerParty === "DEM" ? 40 : 38;

  let target = structuralBase;

  target += (stats.gdpGrowth - 2.2) * 1.4;
  target += Math.max(0, 4.5 - stats.unemployment) * 0.8;
  target -= Math.max(0, stats.unemployment - 4.5) * 2.4;
  target -= Math.max(0, stats.inflation - 2.5) * 2.1;
  target -= Math.max(0, stats.gasPrice - 3.5) * 1.7;
  target -= Math.max(0, stats.crimeRate - 5) * 0.9;

  if (stats.nationalDeficit > 2500) {
    target -= Math.min(2, (stats.nationalDeficit - 2500) / 600);
  }

  return clampRel(target);
}

export function advanceApproval(stats, playerParty, nextWeek, random = Math.random()) {
  const currentApproval = stats.approvalRating ?? HONEYMOON_START_APPROVAL;
  const noise = (random - 0.5) * 0.4;

  if (nextWeek <= HONEYMOON_WEEKS + 1) {
    const honeymoonProgress = Math.min(1, Math.max(0, (nextWeek - 1) / HONEYMOON_WEEKS));
    const scriptedTarget = HONEYMOON_START_APPROVAL
      + (HONEYMOON_TARGET_APPROVAL - HONEYMOON_START_APPROVAL) * honeymoonProgress;
    const macroTarget = computeApprovalTarget(stats, playerParty);
    const blendedTarget = scriptedTarget + (macroTarget - HONEYMOON_TARGET_APPROVAL) * 0.25;

    return clampRel(currentApproval + (blendedTarget - currentApproval) * 0.85 + noise);
  }

  const target = computeApprovalTarget(stats, playerParty);
  return clampRel(currentApproval + (target - currentApproval) * 0.18 + noise);
}
