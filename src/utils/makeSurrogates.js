import { SURROGATE_NAMES } from "../data/constants.js";

/** Create two surrogates with distinct random names. Used at game start and reset. */
export const makeSurrogates = () => {
  const s1Name = SURROGATE_NAMES[Math.floor(Math.random() * SURROGATE_NAMES.length)];
  let s2Name;
  do { s2Name = SURROGATE_NAMES[Math.floor(Math.random() * SURROGATE_NAMES.length)]; } while (s2Name === s1Name);
  return [
    { id: "s1", name: s1Name, title: "Senior Advisor",    busy: null },
    { id: "s2", name: s2Name, title: "Campaign Director", busy: null },
  ];
};
