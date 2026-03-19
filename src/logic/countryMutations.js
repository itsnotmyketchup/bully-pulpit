import { clamp } from "../utils/clamp.js";
import { countryStatus } from "../utils/countryStatus.js";

export function cloneCountries(countries = []) {
  return countries.map((country) => ({ ...country }));
}

export function applyCountryDelta(country, delta = {}) {
  const nextCountry = { ...country };
  if (delta.relationship != null) {
    nextCountry.relationship = clamp((country.relationship || 0) + delta.relationship, 0, 100);
  }
  if (delta.trust != null) {
    nextCountry.trust = clamp((country.trust || 0) + delta.trust, 0, 100);
  }
  nextCountry.status = countryStatus(nextCountry.relationship);
  return nextCountry;
}

export function applyCountryEffects(countries, countryEffects = {}) {
  return countries.map((country) => {
    const effect = countryEffects[country.id];
    return effect ? applyCountryDelta(country, effect) : country;
  });
}

export function applyCountryEffectToAll(countries, delta = {}) {
  return countries.map((country) => applyCountryDelta(country, delta));
}
