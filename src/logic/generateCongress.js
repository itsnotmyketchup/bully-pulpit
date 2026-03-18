import { FACTION_DATA } from "../data/factions.js";

import { clamp } from "../utils/clamp.js";

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

function makeLeader(nameRegistry) {
  return {
    name: nameRegistry.drawName("Leader"),
    charisma: randInt(1, 10),
    authority: randInt(1, 10),
    sincerity: randInt(1, 10),
  };
}

function initUnity(leader, isOpposition) {
  const base = 30 + leader.charisma * 2 + leader.authority * 2 + randInt(0, 10);
  return clamp(base - (isOpposition ? 5 : 0), 40, 80);
}

export function generateCongress(playerParty, playerFaction, nameRegistry) {
  const op = playerParty === "DEM" ? "REP" : "DEM";
  const sm = 52 + Math.floor(Math.random() * 3);
  const hm = 222 + Math.floor(Math.random() * 10);
  const factions = {};

  FACTION_DATA[playerParty].forEach((f, i) => {
    const sw = [0.4, 0.35, 0.25][i], hw = [0.38, 0.37, 0.25][i];
    const leader = makeLeader(nameRegistry);
    factions[f.id] = {
      ...f,
      party: playerParty,
      senateSeats: Math.round(sm * sw),
      houseSeats: Math.round(hm * hw),
      trust: f.id === playerFaction ? 72 + Math.floor(Math.random() * 8) : 42 + Math.floor(Math.random() * 12),
      relationship: f.id === playerFaction ? 75 + Math.floor(Math.random() * 10) : 48 + Math.floor(Math.random() * 10),
      leader,
      unity: initUnity(leader, false),
    };
  });

  FACTION_DATA[op].forEach((f, i) => {
    const sw = [0.35, 0.38, 0.27][i], hw = [0.33, 0.4, 0.27][i];
    const leader = makeLeader(nameRegistry);
    factions[f.id] = {
      ...f,
      party: op,
      senateSeats: Math.round((100 - sm) * sw),
      houseSeats: Math.round((435 - hm) * hw),
      trust: 28 + Math.floor(Math.random() * 10),
      relationship: 18 + Math.floor(Math.random() * 12),
      leader,
      unity: initUnity(leader, true),
    };
  });

  return { sm, hm, factions, pp: playerParty, op };
}
