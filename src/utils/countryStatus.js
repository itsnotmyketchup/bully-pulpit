/** Derive the display status string from a numeric relationship score (0-100). */
export const countryStatus = rel =>
  rel >= 70 ? "ALLIED"
  : rel >= 50 ? "FRIENDLY"
  : rel >= 30 ? "NEUTRAL"
  : rel >= 15 ? "UNFRIENDLY"
  : "HOSTILE";
