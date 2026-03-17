export const clamp    = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const clampRel = v => clamp(v, 5, 95);   // faction relationship / country rel / approval
export const clampUni = v => clamp(v, 20, 95);  // faction unity
