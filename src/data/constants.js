export const TABS = ["overview", "congress", "party", "cabinet", "policy", "actions", "diplomacy", "log"];

export const ALLIED_FACTIONS     = { DEM: ["prog","mod_dem","blue_dog"], REP: ["freedom","mod_rep","trad_con"] };
export const OPPOSITION_FACTIONS = { DEM: ["freedom","mod_rep","trad_con"], REP: ["prog","mod_dem","blue_dog"] };

export const COUNTRY_FACTION_EFFECTS = {
  israel: { prog: -0.15, trad_con: 0.2, freedom: 0.15 },
  saudi:  { prog: -0.2, mod_dem: -0.1 },
  china:  { freedom: -0.3, mod_rep: -0.15 },
};

export const SURROGATE_NAMES = [
  "Marcus Webb","Priya Nair","Darnell Hayes","Sofia Reyes","Patrick Luo",
  "Amara Osei","Ethan Kovacs","Leila Farouk","Caleb Nguyen","Diane Okonkwo",
  "Victor Salinas","Naomi Whitfield","Jesse Park","Carmen Delgado","Theo Burrows",
];
