/** Create two surrogates with distinct random names. Used at game start and reset. */
export const makeSurrogates = (nameRegistry) => {
  const [s1Name, s2Name] = nameRegistry.drawNames(2, "Surrogate");
  return [
    { id: "s1", name: s1Name, title: "Senior Advisor",    busy: null },
    { id: "s2", name: s2Name, title: "Campaign Director", busy: null },
  ];
};
