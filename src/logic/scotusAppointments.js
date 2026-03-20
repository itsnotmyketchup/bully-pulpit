import { ALLIED_FACTIONS, OPPOSITION_FACTIONS } from "../data/constants.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// ── Ideology helpers ─────────────────────────────────────────────────────────

export const SCOTUS_IDEOLOGIES = ["very_liberal", "liberal", "conservative", "very_conservative"];

export const IDEOLOGY_LABEL = {
  very_liberal: "Very Liberal",
  liberal: "Liberal",
  conservative: "Conservative",
  very_conservative: "Very Conservative",
};

export const IDEOLOGY_PARTY = {
  very_liberal: "DEM",
  liberal: "DEM",
  conservative: "REP",
  very_conservative: "REP",
};

export const IDEOLOGY_COLOR = {
  very_liberal: "#5a6fd8",
  liberal: "#378ADD",
  conservative: "#EF9F27",
  very_conservative: "#E24B4A",
};

// For each player faction, which ideologies count as "allied"
const ALLIED_IDEOLOGIES = {
  DEM: ["very_liberal", "liberal"],
  REP: ["conservative", "very_conservative"],
};

export function isAlliedIdeology(ideology, playerParty) {
  return ALLIED_IDEOLOGIES[playerParty]?.includes(ideology) ?? false;
}

// ── Court seat definitions ───────────────────────────────────────────────────

// Fixed seat slots: index 0 = Chief Justice, 1-8 = Associates
// Ideology distribution per difficulty (from player's perspective):
//   easy:      6-3 for player
//   normal:    5-4 for player
//   hard:      5-4 against player
//   very_hard: 6-3 against player

function getIdeologySlots(playerParty, difficulty) {
  const ally  = ALLIED_IDEOLOGIES[playerParty];
  const oppo  = ALLIED_IDEOLOGIES[playerParty === "DEM" ? "REP" : "DEM"];

  // Total 9 seats; how many lean player's way
  const allyCount = { easy: 6, normal: 5, hard: 4, very_hard: 3 }[difficulty] ?? 5;
  const oppoCount = 9 - allyCount;

  const slots = [];

  // Spread ally seats between the two allied ideologies
  const strongAlly = allyCount > Math.floor(allyCount / 2) ? Math.ceil(allyCount / 2) : Math.floor(allyCount / 2);
  const mildAlly   = allyCount - strongAlly;
  for (let i = 0; i < strongAlly; i++) slots.push(ally[0]);
  for (let i = 0; i < mildAlly;   i++) slots.push(ally[1]);

  // Spread opposition seats
  const strongOppo = Math.ceil(oppoCount / 2);
  const mildOppo   = oppoCount - strongOppo;
  for (let i = 0; i < strongOppo; i++) slots.push(oppo[0]);
  for (let i = 0; i < mildOppo;   i++) slots.push(oppo[1]);

  // Shuffle (Fisher-Yates)
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  return slots; // length 9
}

// ── Justice generation ───────────────────────────────────────────────────────

export function generateInitialJustices(playerParty, difficulty, nameRegistry) {
  const ideologySlots = getIdeologySlots(playerParty, difficulty);

  return ideologySlots.map((ideology, i) => {
    const isChief    = i === 0;
    const age        = randInt(50, 78);
    // Older justices strongly tend to have served longer.
    // ageBias 0→1 as age 50→78; fraction = 0.20 + ageBias*0.50 + rand*0.30 → older = higher fraction.
    const maxServed  = Math.min(35, age - 35);
    const ageBias    = (age - 50) / 28;
    const fraction   = clamp(0.20 + ageBias * 0.50 + Math.random() * 0.30, 0, 1);
    const timeServed = Math.max(0, Math.round(fraction * maxServed));
    return {
      id: `justice_${i}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: nameRegistry.drawName("Justice"),
      age,
      timeServed,
      party: IDEOLOGY_PARTY[ideology],
      ideology,
      isChief,
    };
  });
}

// ── Yearly aging ─────────────────────────────────────────────────────────────

export function ageJustices(justices) {
  return justices.map(j => ({ ...j, age: j.age + 1, timeServed: j.timeServed + 1 }));
}

// ── Death / Retirement probability ───────────────────────────────────────────
// Target: ~1-2 vacancies per 4 years (208 weeks), 3 rarely (~15%)
// Opposition justices NEVER retire, only die.
// Allied justices can die OR retire (retirement ramps up with age).

function deathProbPerWeek(age) {
  // ~0.02%/week at 50 → ~0.12%/week at 80 (cumulative ~10-60% over 4yr term, but 9 justices)
  return clamp(0.0002 + (age - 50) * 0.000033, 0.00005, 0.002);
}

function retireProbPerWeek(age) {
  // Starts at 0 below 60, ramps to ~0.08%/week at 80
  if (age < 60) return 0;
  return clamp(0.0001 + (age - 60) * 0.000035, 0, 0.0008);
}

/**
 * Given the current justices, return { dying: Justice|null, retiring: Justice|null }
 * At most one vacancy event per call (dying takes precedence if both roll).
 */
export function checkJusticeVacancy(justices, playerParty) {
  // Shuffle so order of evaluation is random
  const shuffled = [...justices].sort(() => Math.random() - 0.5);

  for (const j of shuffled) {
    const deathRoll    = Math.random();
    const deathProb    = deathProbPerWeek(j.age);
    if (deathRoll < deathProb) return { type: "death",     justice: j };
  }

  for (const j of shuffled) {
    if (!isAlliedIdeology(j.ideology, playerParty)) continue; // opposition never retires
    const retireRoll   = Math.random();
    const retireProb   = retireProbPerWeek(j.age);
    if (retireRoll < retireProb) return { type: "retirement", justice: j };
  }

  return null;
}

// ── Candidate generation ──────────────────────────────────────────────────────
// 4 candidates per batch (one per ideology), batches are generated fresh each time.

const IDEOLOGY_SCORES = {
  very_liberal:    -0.90,
  liberal:         -0.45,
  conservative:     0.45,
  very_conservative: 0.90,
};

function buildJusticeFactionReactions(playerParty, candidateIdeology) {
  const allFactions = [...(ALLIED_FACTIONS[playerParty] || []), ...(OPPOSITION_FACTIONS[playerParty] || [])];
  const candidateScore = IDEOLOGY_SCORES[candidateIdeology] ?? 0;

  return Object.fromEntries(allFactions.map(fid => {
    const factionScore = {
      prog:     -0.90,
      mod_dem:  -0.40,
      blue_dog: -0.10,
      mod_rep:   0.35,
      trad_con:  0.65,
      freedom:   0.90,
    }[fid] ?? 0;

    const dist = Math.abs(candidateScore - factionScore);
    // Steeper curve: dist=0 → +0.85 (strong yes), dist=0.45 → +0.44 (solid yes),
    // dist=0.90 → +0.03 (coin-flip), dist=1.35 → −0.38 (leans no), dist=1.80 → −0.80 (strong no)
    const reaction = clamp(0.85 - dist * 0.92, -0.92, 0.92);
    return [fid, Number(reaction.toFixed(3))];
  }));
}

export function generateScotusJusticeCandidates(playerParty, nameRegistry) {
  return SCOTUS_IDEOLOGIES.map(ideology => ({
    id: `scotus_cand_${ideology}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: nameRegistry.drawName("Justice"),
    age:  randInt(44, 62), // nominees tend to be younger to serve longer
    ideology,
    party: IDEOLOGY_PARTY[ideology],
    factionReactions: buildJusticeFactionReactions(playerParty, ideology),
  }));
}

// ── Senate confirmation (reuses evaluateAppointment logic inline) ─────────────

export function buildScotusAppointmentProcess(nominee) {
  return {
    officeId: "scotus",
    officeLabel: "Supreme Court Justice",
    nomineeName: nominee.name,
    nomineeIdeology: nominee.ideology,
    nomineeAge: nominee.age,
    factionReactions: nominee.factionReactions,
    stage: "committee_hearing",
    turnsInStage: 0,
    fails: 0,
    passLikelihood: 100,
    factionVotes: null,
    lobbyUsedStage: null,
    isHighPriority: true,
    stages: [
      { id: "committee_hearing", label: "Committee Hearing",  desc: "Preliminary hearing underway" },
      { id: "committee_vote",    label: "Committee Vote",     desc: "Committee vote pending" },
      { id: "senate_vote",       label: "Senate Vote",        desc: "Awaiting full Senate vote" },
    ],
  };
}
