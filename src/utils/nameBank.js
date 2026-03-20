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
  "Steven Caldwell", "Angela Whitaker", "Douglas Hensley", "Cynthia Barrett", "Bruce Ellison",
  "Denise Cartwright", "Ronald Mercer", "Pamela Sutton", "Gregory Harlan", "Deborah Pike",
  "Scott Langley", "Brenda Whitfield", "Eric Sanderson", "Theresa Colby", "Kevin Halstead",
  "Laura McKinney", "Patrick Donnelly", "Shannon Reeves", "Timothy Grayson", "Melissa Corbett",
  "Jason Whitman", "Kristin Farley", "Adam Lockwood", "Tracy Hollowell", "Benjamin Kline",
  "Erin Callahan", "Zachary Prescott", "Lori Hanley", "Nathaniel Burke", "Heidi Dunlap",
  "Christian Talbot", "Monique Harlan", "Derek Garrison", "Valerie Stokes", "Kyle Rutledge",
  "Courtney Ellsworth", "Sean Whitaker", "April Costigan", "Philip Redmond", "Tiffany Slade",
  "Joel Beckett", "Vanessa Corwin", "Evan Talley", "Kara Winslow", "Colin Prescott",
  "Meghan Farrow", "Jared Keaton", "Alyssa Norwood", "Spencer Hadley", "Kelsey Denton",
  "Blake Treadwell", "Rachael Kimball", "Grant Holloway", "Paula Winslow", "Tristan Keefe",
  "Danielle Mercer", "Lucas Pendleton", "Whitney Crane", "Corey Halbrook", "Miranda Sloane",
  "Brent Calloway", "Holly Stratton", "Logan Pierce", "Stacey Whitmore", "Trevor Ellison",
  "Jillian Rhodes", "Cody Bennett", "Megan Draper", "Austin Caldwell", "Bethany Osborne",
  "Chad Hollowell", "Krista Monroe", "Dylan Whitfield", "Amber Quinn", "Garrett Sloane",
  "Leah Cartwright", "Tyler Maddox", "Kaitlyn Reeves", "Preston Langford", "Brooke Tanner",
  "Colby Merritt", "Jocelyn Pike", "Shawn Rutledge", "Cassidy Farley", "Dustin Gable",
  "Marissa Colbert", "Trevor Hensley", "Natalia Boone", "Wade Kauffman", "Lindsey Barrett",
  "Mitchell Grayson", "Alison Drakeford", "Ross Callahan", "Elise Norwood", "Brett Sanderson",
  "Samantha Keaton", "Calvin Whitaker", "Hannah Prescott", "Dominic Harlan", "Paula Whitman"
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

