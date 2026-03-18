import { FACTION_DATA } from "../data/factions.js";
import { ALLIED_FACTIONS, OPPOSITION_FACTIONS } from "../data/constants.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

const IDEOLOGY_SCORES = {
  prog: -0.95,
  mod_dem: -0.35,
  blue_dog: 0.1,
  mod_rep: 0.25,
  trad_con: 0.65,
  freedom: 1,
};

function getFactionById(factionId) {
  for (const [party, factions] of Object.entries(FACTION_DATA)) {
    const faction = factions.find(entry => entry.id === factionId);
    if (faction) return { ...faction, party };
  }
  return null;
}

function getModerateFactionId(party) {
  return party === "DEM" ? "mod_dem" : "mod_rep";
}

function buildSecStateReactions(playerParty, candidateFactionId, charisma, experience) {
  const candidateFaction = getFactionById(candidateFactionId);
  const candidateParty = candidateFaction?.party || (playerParty === "DEM" ? "REP" : "DEM");
  const playerModerateId = getModerateFactionId(playerParty);
  const oppositionModerateId = getModerateFactionId(candidateParty);
  const hiddenBonus = (charisma > 1 ? 0.02 : 0) + (experience > 1 ? 0.02 : 0);
  const allFactions = [...ALLIED_FACTIONS[playerParty], ...OPPOSITION_FACTIONS[playerParty]];

  return Object.fromEntries(allFactions.map(factionId => {
    const faction = getFactionById(factionId);
    const sameParty = faction?.party === candidateParty;
    const ideologicalDistance = Math.abs((IDEOLOGY_SCORES[factionId] || 0) - (IDEOLOGY_SCORES[candidateFactionId] || 0));

    let reaction = sameParty
      ? 0.45 - ideologicalDistance * 0.35
      : 0.08 - ideologicalDistance * 0.28;

    if (factionId === candidateFactionId) reaction += 0.2;

    if (candidateParty !== playerParty && faction?.party === playerParty) {
      const basePenalty = 0.12 + ideologicalDistance * 0.12;
      const doubledPenalty = basePenalty * 2;
      const exemptModerate = candidateFactionId === oppositionModerateId && factionId === playerModerateId;
      if (!exemptModerate) reaction -= doubledPenalty;
    }

    if (candidateParty === playerParty && faction?.party !== playerParty) {
      reaction -= 0.05;
    }

    reaction += hiddenBonus;
    return [factionId, clamp(Number(reaction.toFixed(3)), -0.95, 0.95)];
  }));
}

export function generateSecStateCandidates(playerParty, nameRegistry) {
  const factions = [...FACTION_DATA[playerParty], ...FACTION_DATA[playerParty === "DEM" ? "REP" : "DEM"]];
  const candidates = factions.map(faction => {
    const charisma = randInt(1, 3);
    const experience = randInt(1, 3);
    return {
      id: `secstate_${faction.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: nameRegistry.drawName("Secretary"),
      factionId: faction.id,
      factionName: faction.name,
      party: faction.party,
      charisma,
      experience,
      reactions: buildSecStateReactions(playerParty, faction.id, charisma, experience),
    };
  });

  return candidates.sort(() => Math.random() - 0.5);
}
