const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const APPOINTMENT_STAGES = [
  { id: "committee_hearing", label: "Committee Hearing", desc: "Preliminary hearing underway" },
  { id: "committee_vote", label: "Committee Vote", desc: "Committee vote pending" },
  { id: "senate_vote", label: "Senate Vote", desc: "Awaiting full Senate vote" },
];

export function evaluateAppointment(congress, factionReactions = {}) {
  const factions = Object.values(congress.factions || {});
  const totalSenate = factions.reduce((sum, faction) => sum + (faction.senateSeats || 0), 0);

  let senateYes = 0;
  const factionVotes = factions.map(faction => {
    const reaction = clamp(factionReactions[faction.id] ?? -0.2, -1, 1);
    const normalizedReaction = (reaction + 1) / 2;
    const rel = (faction.relationship || 50) / 100;
    const trust = (faction.trust || 50) / 100;
    const unity = (faction.unity || 50) / 100;
    const support = clamp(normalizedReaction + (rel - 0.5) * 0.18 + (trust - 0.5) * 0.1, 0, 1);
    const yesFrac = support > 0.5
      ? support + (1 - support) * unity * 0.4
      : support * (1 - unity * 0.35);
    const senYes = Math.round((faction.senateSeats || 0) * clamp(yesFrac, 0, 1));
    senateYes += senYes;

    return {
      fid: faction.id,
      name: faction.name,
      voteProb: support,
      unity: faction.unity || 50,
      senateSeats: faction.senateSeats || 0,
      houseSeats: 0,
      senateYes: senYes,
      houseYes: 0,
    };
  });

  const passLikelihood = totalSenate > 0
    ? Math.round(clamp((senateYes / totalSenate) * 100, 0, 100))
    : 0;

  return {
    passed: senateYes >= 51,
    senateYes,
    senateNo: totalSenate - senateYes,
    totalSenate,
    passLikelihood,
    factionVotes,
  };
}
