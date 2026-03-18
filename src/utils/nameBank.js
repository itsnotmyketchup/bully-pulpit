const POLITICAL_NAME_BANK = [
  "Margaret Holloway", "James Sutton", "Patricia Vance", "Robert Calloway", "Sandra Merritt",
  "Thomas Prescott", "Linda Kauffman", "Charles Ellsworth", "Barbara Whitmore", "David Langford",
  "Nancy Aldridge", "Richard Holbrook", "Karen Stratton", "Michael Dunmore", "Betty Ashford",
  "William Farrow", "Helen Cortland", "Joseph Blackwell", "Dorothy Quinlan", "Edward Harrington",
  "Ruth Pendleton", "Frank Kimball", "Shirley Bowman", "Raymond Castillo", "Janet Norris",
  "Arthur Gillespie", "Martha Davenport", "Walter Osborne", "Virginia Tanner", "Harold Fisk",
  "Carol Westbrook", "Gerald Munroe", "Donna Slattery", "Lawrence Pittman", "Judith Cranston",
  "Roger Fairfield", "Carolyn Bridger", "Keith Madden", "Jean Collier", "Gary Stoneman",
  "Diane Whitfield", "Alan Holt", "Cheryl Paxton", "Brian Sommers", "Ann Burgess",
  "Marcus Webb", "Priya Nair", "Darnell Hayes", "Sofia Reyes", "Patrick Luo",
  "Amara Osei", "Ethan Kovacs", "Leila Farouk", "Caleb Nguyen", "Diane Okonkwo",
  "Victor Salinas", "Naomi Whitfield", "Jesse Park", "Carmen Delgado", "Theo Burrows",
  "Evelyn Hart", "Marcus Bell", "Naomi Sterling", "Adrian Cole", "Lillian Price",
  "Victor Hale", "Maya Ellison", "Julian Mercer", "Claire Whitman", "Daniel Sloane",
  "Tessa Vaughn", "Owen Cartwright", "Elena Marquez", "Samuel Pike", "Renee Hollowell",
  "Graham Mercer", "Vanessa Whitaker", "Julio Estrada", "Denise Halbrook", "Trevor Lam",
  "Monica Patel", "Brandon Pierce", "Fiona Gallagher", "Isaac Monroe", "Avery Caldwell",
  "Natalie Sosa", "Malcolm Draper", "Bianca Russo", "Hector Alvarez", "Meredith Sloan",
  "Olivia Han", "Noah Bennett", "Camille Jordan", "Devin Carlisle", "Sabrina Hsu",
  "Andre Mercer", "Katherine Doyle", "Wesley Abbott", "Nina Costello", "Jordan Pruitt",
  "Rebecca McCall", "Simon Barrett", "Erica Townsend", "Terrence Boone", "Gloria Mendez",
  "Xavier Ramsey", "Alicia Dunn", "Dominic Bauer", "Paige Thornton", "Rafael Cortez",
  "Mallory Beck", "Curtis Hammond", "Leslie Vaughn", "Gavin Rhodes", "Tara Holloway",
  "Phoebe Lawson", "Micah Sullivan", "Allison Drake", "Peter Choi", "Marlon West",
];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function createNameRegistry(initialUsed = []) {
  const used = new Set(initialUsed);

  return {
    drawName(fallbackPrefix = "Official") {
      const available = POLITICAL_NAME_BANK.filter(name => !used.has(name));
      const name = available.length > 0 ? randomItem(available) : `${fallbackPrefix} ${used.size + 1}`;
      used.add(name);
      return name;
    },

    drawNames(count, fallbackPrefix = "Official") {
      return Array.from({ length: count }, () => this.drawName(fallbackPrefix));
    },

    markUsed(name) {
      if (name) used.add(name);
    },

    has(name) {
      return used.has(name);
    },

    reset(nextUsed = []) {
      used.clear();
      nextUsed.forEach(name => used.add(name));
    },
  };
}

