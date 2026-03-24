export interface CompanionPlant {
  name: string;
  emoji: string;
  goodWith: string[];
  badWith: string[];
}

export type Compatibility = "good" | "bad" | "neutral";

export const COMPANION_PLANTS: CompanionPlant[] = [
  {
    name: "Tomato",
    emoji: "🍅",
    goodWith: ["Basil", "Carrot", "Parsley", "Marigold", "Asparagus", "Garlic"],
    badWith: ["Fennel", "Kale", "Broccoli", "Cabbage", "Potato", "Corn"],
  },
  {
    name: "Pepper",
    emoji: "🌶️",
    goodWith: ["Basil", "Tomato", "Carrot", "Marigold"],
    badWith: ["Fennel"],
  },
  {
    name: "Potato",
    emoji: "🥔",
    goodWith: ["Beans", "Peas", "Corn", "Marigold"],
    badWith: ["Tomato", "Pepper", "Squash", "Cucumber", "Sunflower"],
  },
  {
    name: "Peas",
    emoji: "🫛",
    goodWith: ["Carrot", "Cucumber", "Radish", "Lettuce", "Spinach", "Mint"],
    badWith: ["Onion", "Garlic", "Shallots", "Fennel"],
  },
  {
    name: "Beans",
    emoji: "🫘",
    goodWith: ["Carrot", "Cucumber", "Squash", "Peas", "Radish", "Celery", "Potato"],
    badWith: ["Onion", "Garlic", "Shallots", "Fennel", "Beets"],
  },
  {
    name: "Cucumber",
    emoji: "🥒",
    goodWith: ["Beans", "Peas", "Radish", "Sunflower", "Lettuce", "Dill"],
    badWith: ["Potato", "Sage"],
  },
  {
    name: "Squash",
    emoji: "🎃",
    goodWith: ["Beans", "Corn", "Radish", "Marigold", "Nasturtium"],
    badWith: ["Potato"],
  },
  {
    name: "Corn",
    emoji: "🌽",
    goodWith: ["Beans", "Squash", "Cucumber", "Peas"],
    badWith: ["Tomato"],
  },
  {
    name: "Carrot",
    emoji: "🥕",
    goodWith: ["Tomato", "Peas", "Lettuce", "Onion", "Rosemary", "Sage"],
    badWith: ["Dill", "Fennel"],
  },
  {
    name: "Lettuce",
    emoji: "🥬",
    goodWith: ["Carrot", "Radish", "Onion", "Beets", "Cucumber", "Strawberry"],
    badWith: ["Celery"],
  },
  {
    name: "Onion",
    emoji: "🧅",
    goodWith: ["Carrot", "Beets", "Lettuce", "Tomato"],
    badWith: ["Peas", "Beans", "Asparagus"],
  },
  {
    name: "Garlic",
    emoji: "🧄",
    goodWith: ["Tomato", "Carrot", "Beets", "Pepper"],
    badWith: ["Peas", "Beans"],
  },
  {
    name: "Beets",
    emoji: "🌱",
    goodWith: ["Garlic", "Onion", "Lettuce", "Broccoli", "Kale"],
    badWith: ["Beans", "Tomato"],
  },
  {
    name: "Kale",
    emoji: "🥦",
    goodWith: ["Celery", "Onion", "Beets", "Dill"],
    badWith: ["Tomato", "Strawberry", "Fennel"],
  },
  {
    name: "Broccoli",
    emoji: "🥦",
    goodWith: ["Celery", "Onion", "Beets", "Dill", "Marigold"],
    badWith: ["Tomato", "Strawberry", "Fennel"],
  },
  {
    name: "Cabbage",
    emoji: "🥬",
    goodWith: ["Celery", "Onion", "Beets", "Dill", "Mint"],
    badWith: ["Tomato", "Strawberry", "Fennel"],
  },
  {
    name: "Arugula",
    emoji: "🌿",
    goodWith: ["Onion", "Carrot", "Lettuce"],
    badWith: ["Fennel"],
  },
  {
    name: "Spinach",
    emoji: "🌿",
    goodWith: ["Strawberry", "Peas", "Beans", "Celery"],
    badWith: [],
  },
  {
    name: "Swiss Chard",
    emoji: "🌿",
    goodWith: ["Beans", "Onion", "Kale", "Broccoli"],
    badWith: [],
  },
  {
    name: "Radish",
    emoji: "🌸",
    goodWith: ["Cucumber", "Peas", "Lettuce", "Squash", "Carrot"],
    badWith: [],
  },
  {
    name: "Celery",
    emoji: "🌿",
    goodWith: ["Beans", "Kale", "Broccoli", "Cabbage", "Spinach"],
    badWith: ["Carrot"],
  },
  {
    name: "Shallots",
    emoji: "🧅",
    goodWith: ["Carrot", "Beets", "Lettuce"],
    badWith: ["Peas", "Beans"],
  },
  {
    name: "Asparagus",
    emoji: "🌱",
    goodWith: ["Tomato", "Basil", "Parsley"],
    badWith: ["Onion", "Garlic"],
  },
  {
    name: "Basil",
    emoji: "🌿",
    goodWith: ["Tomato", "Pepper", "Marigold"],
    badWith: ["Sage"],
  },
  {
    name: "Dill",
    emoji: "🌿",
    goodWith: ["Kale", "Broccoli", "Cabbage", "Lettuce", "Cucumber"],
    badWith: ["Carrot", "Tomato", "Fennel"],
  },
  {
    name: "Fennel",
    emoji: "🌿",
    goodWith: ["Dill"],
    badWith: [
      "Tomato", "Pepper", "Beans", "Peas", "Kale", "Broccoli", "Cabbage",
      "Carrot", "Arugula",
    ],
  },
  {
    name: "Marigold",
    emoji: "🌼",
    goodWith: ["Tomato", "Pepper", "Squash", "Beans", "Cucumber", "Potato", "Broccoli"],
    badWith: [],
  },
  {
    name: "Sunflower",
    emoji: "🌻",
    goodWith: ["Cucumber", "Squash", "Corn"],
    badWith: ["Potato"],
  },
  {
    name: "Mint",
    emoji: "🌿",
    goodWith: ["Cabbage", "Peas", "Tomato"],
    badWith: [],
  },
  {
    name: "Strawberry",
    emoji: "🍓",
    goodWith: ["Lettuce", "Spinach", "Onion", "Garlic"],
    badWith: ["Kale", "Broccoli", "Cabbage"],
  },
];

/**
 * Returns compatibility between two plants, checking both directions.
 * Bad always wins over good if both are declared.
 */
export function getCompatibility(plant1: string, plant2: string): Compatibility {
  if (plant1 === plant2) return "neutral";

  const p1 = COMPANION_PLANTS.find((p) => p.name === plant1);
  const p2 = COMPANION_PLANTS.find((p) => p.name === plant2);

  const isGood =
    p1?.goodWith.includes(plant2) || p2?.goodWith.includes(plant1);
  const isBad =
    p1?.badWith.includes(plant2) || p2?.badWith.includes(plant1);

  if (isBad) return "bad";
  if (isGood) return "good";
  return "neutral";
}

/** Returns all known companions and foes for a single plant. */
export function getPlantRelationships(plantName: string): {
  good: string[];
  bad: string[];
} {
  const goodSet = new Set<string>();
  const badSet = new Set<string>();

  const plant = COMPANION_PLANTS.find((p) => p.name === plantName);
  plant?.goodWith.forEach((g) => goodSet.add(g));
  plant?.badWith.forEach((b) => badSet.add(b));

  // Reverse lookup — other plants that list this one
  COMPANION_PLANTS.forEach((p) => {
    if (p.name === plantName) return;
    if (p.goodWith.includes(plantName)) goodSet.add(p.name);
    if (p.badWith.includes(plantName)) badSet.add(p.name);
  });

  // Bad wins over good when both are declared
  goodSet.forEach((g) => { if (badSet.has(g)) goodSet.delete(g); });

  // Only keep plants that exist in our list
  const known = new Set(COMPANION_PLANTS.map((p) => p.name));
  return {
    good: Array.from(goodSet).filter((g) => known.has(g)).sort(),
    bad: Array.from(badSet).filter((b) => known.has(b)).sort(),
  };
}
