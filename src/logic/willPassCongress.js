export function willPassCongress(action, congress) {
  let senateYes = 0, houseYes = 0;

  Object.values(congress.factions).forEach(f => {
    let r = action.factionReactions[f.id];
    if (r == null) r = -0.3;
    const rel = (f.relationship || 50) / 100;
    const tr = (f.trust || 50) / 100;
    const support = r * 0.5 + rel * 0.3 + tr * 0.2;

    if (support > 0.2) {
      senateYes += f.senateSeats;
      houseYes += f.houseSeats;
    } else if (support > -0.05) {
      senateYes += Math.round(f.senateSeats * 0.35);
      houseYes += Math.round(f.houseSeats * 0.35);
    }
  });

  return { sy: senateYes, hy: houseYes, pass: senateYes >= 51 && houseYes >= 218 };
}
