/**
 * Seattle metro / PNW Zone 8b — common garden pests, diseases, and
 * nutrient deficiencies with their typical organic remedies.
 *
 * Sourced from WSU Extension, Tilth Alliance, and OSU Extension guides.
 * Remedies are intentionally organic-first and phrased for a home gardener.
 */

export interface CatalogEntry {
  name: string;
  remedies: string[];
}

export const PNW_PESTS: CatalogEntry[] = [
  {
    name: "Aphids",
    remedies: [
      "Blast off with strong water stream",
      "Neem oil spray (evening)",
      "Insecticidal soap",
      "Release ladybugs or lacewings",
    ],
  },
  {
    name: "Slugs / Snails",
    remedies: [
      "Iron phosphate bait (Sluggo)",
      "Beer trap at soil level",
      "Copper tape barrier",
      "Handpick at night with flashlight",
    ],
  },
  {
    name: "Cabbage worms / Cabbage loopers",
    remedies: [
      "Bt (Bacillus thuringiensis) spray",
      "Hand-pick caterpillars",
      "Floating row cover until flowering",
    ],
  },
  {
    name: "Cabbage root maggot",
    remedies: [
      "Row cover at transplant",
      "Paper / cardboard collars around stems",
      "Rotate brassicas (3-year minimum)",
    ],
  },
  {
    name: "Carrot rust fly",
    remedies: [
      "Floating row cover entire season",
      "Delay planting until early June",
      "Rotate away from last year's carrot bed",
    ],
  },
  {
    name: "Cutworms",
    remedies: [
      "Cardboard / foil collars around seedlings",
      "Diatomaceous earth ring at soil line",
      "Till beds in fall to expose pupae",
    ],
  },
  {
    name: "Spider mites",
    remedies: [
      "Strong water spray on leaf undersides",
      "Neem oil",
      "Insecticidal soap",
      "Increase humidity",
    ],
  },
  {
    name: "Whiteflies",
    remedies: [
      "Yellow sticky traps",
      "Neem oil spray",
      "Insecticidal soap",
    ],
  },
  {
    name: "Flea beetles",
    remedies: [
      "Floating row cover over seedlings",
      "Yellow sticky traps",
      "Diatomaceous earth",
      "Kaolin clay spray",
    ],
  },
  {
    name: "Leaf miners",
    remedies: [
      "Remove / destroy affected leaves",
      "Row cover over chard / beets / spinach",
      "Neem oil",
    ],
  },
  {
    name: "Spittlebugs (froghoppers)",
    remedies: [
      "Hose off foam with water",
      "Tolerate — rarely cause real damage",
    ],
  },
  {
    name: "Tent caterpillars",
    remedies: [
      "Prune out tents in early morning",
      "Bt spray on foliage",
      "Remove egg masses in winter",
    ],
  },
  {
    name: "Earwigs",
    remedies: [
      "Rolled damp newspaper trap overnight",
      "Diatomaceous earth around stems",
      "Tuna can with vegetable oil trap",
    ],
  },
  {
    name: "Root weevils",
    remedies: [
      "Beneficial nematodes in spring / fall",
      "Sticky tree bands",
      "Hand-pick at night",
    ],
  },
  {
    name: "Codling moth (apples)",
    remedies: [
      "Pheromone traps for monitoring",
      "Spinosad spray at petal fall",
      "Bag individual fruits",
      "Corrugated cardboard trunk bands",
    ],
  },
  {
    name: "Apple maggot",
    remedies: [
      "Red-sphere sticky traps at bloom",
      "Footie / bag individual fruit",
      "Clean up drops daily",
    ],
  },
  {
    name: "Cherry fruit fly",
    remedies: [
      "Yellow sticky traps at fruit color change",
      "Spinosad spray weekly from pit-hardening",
      "Pick clean after harvest",
    ],
  },
  {
    name: "Squash bugs",
    remedies: [
      "Hand-pick copper egg clusters off leaves",
      "Trap under board overnight, destroy in morning",
      "Neem oil on nymphs",
    ],
  },
  {
    name: "Thrips",
    remedies: [
      "Blue sticky traps",
      "Insecticidal soap",
      "Neem oil",
    ],
  },
  {
    name: "Japanese beetles",
    remedies: [
      "Hand-pick into soapy water at dawn",
      "Milky spore applied to lawn for grubs",
      "Row cover during peak flight",
    ],
  },
  {
    name: "Deer",
    remedies: [
      "7-8 ft fence or double 4 ft offset fence",
      "Motion-activated sprinkler",
      "Liquid Fence / Plantskydd spray",
    ],
  },
  {
    name: "Rabbits",
    remedies: [
      "Hardware-cloth fence (2 ft tall, 6 in buried)",
      "Chicken-wire cloches over seedlings",
      "Blood meal as repellent",
    ],
  },
  {
    name: "Raccoons",
    remedies: [
      "Electric fence (low strand)",
      "Motion-activated sprinkler",
      "Harvest corn promptly",
    ],
  },
];

export const PNW_DISEASES: CatalogEntry[] = [
  {
    name: "Powdery mildew",
    remedies: [
      "1 tsp baking soda + 1 qt water + drop of soap, spray weekly",
      "Milk spray (1 part milk : 9 parts water)",
      "Neem oil",
      "Improve air circulation — thin crowded plants",
    ],
  },
  {
    name: "Late blight (tomato / potato)",
    remedies: [
      "Remove & bag affected plants (do not compost)",
      "Copper fungicide as preventive",
      "Avoid overhead watering",
      "Plant resistant varieties (e.g. Defiant, Mountain Magic)",
    ],
  },
  {
    name: "Early blight (tomato)",
    remedies: [
      "Strip lower leaves as they spot",
      "Copper / Bacillus subtilis fungicide",
      "Mulch to prevent soil splash",
      "Stake / cage for airflow",
    ],
  },
  {
    name: "Downy mildew",
    remedies: [
      "Improve airflow and plant spacing",
      "Copper fungicide",
      "Water at soil level only",
    ],
  },
  {
    name: "Botrytis (gray mold)",
    remedies: [
      "Remove moldy tissue immediately",
      "Thin for better airflow",
      "Reduce humidity — avoid evening watering",
    ],
  },
  {
    name: "Rust",
    remedies: [
      "Remove infected leaves and destroy",
      "Sulfur spray",
      "Water at base, never overhead",
    ],
  },
  {
    name: "Black spot (rose / stone fruit)",
    remedies: [
      "Prune out diseased canes / leaves",
      "Neem oil weekly",
      "Rake and dispose of fallen leaves",
    ],
  },
  {
    name: "Apple scab",
    remedies: [
      "Rake & destroy fallen leaves in fall",
      "Sulfur sprays from green-tip through petal fall",
      "Plant resistant cultivars (Liberty, Enterprise)",
    ],
  },
  {
    name: "Peach leaf curl",
    remedies: [
      "Copper fungicide in late winter before bud break",
      "Second spray at leaf drop in fall",
      "Plant resistant cultivars (Frost, Q-1-8)",
    ],
  },
  {
    name: "Verticillium wilt",
    remedies: [
      "Remove & destroy affected plants",
      "Rotate out of host family 4+ years",
      "Solarize soil in summer",
    ],
  },
  {
    name: "Fusarium wilt",
    remedies: [
      "Remove affected plants",
      "Plant resistant (VFN) varieties",
      "Long crop rotation",
    ],
  },
  {
    name: "Clubroot (brassicas)",
    remedies: [
      "Raise soil pH above 7.2 with dolomite lime",
      "5-7 year rotation out of brassicas",
      "Improve drainage",
    ],
  },
  {
    name: "Damping off (seedlings)",
    remedies: [
      "Use sterile seed-starting mix",
      "Bottom-water only",
      "Add a fan for airflow",
      "Chamomile tea drench",
    ],
  },
  {
    name: "Septoria leaf spot",
    remedies: [
      "Strip infected lower leaves",
      "Mulch to stop soil splash",
      "Copper fungicide every 7-10 days",
    ],
  },
  {
    name: "Anthracnose",
    remedies: [
      "Prune out infected tissue (dry weather)",
      "Copper fungicide",
      "Clean up fallen debris",
    ],
  },
  {
    name: "Bacterial canker (stone fruit)",
    remedies: [
      "Prune only in dry summer weather",
      "Sterilize tools between cuts (10% bleach)",
      "Copper spray in fall leaf-drop",
    ],
  },
  {
    name: "Blossom end rot (calcium)",
    remedies: [
      "Maintain even moisture (mulch + deep watering)",
      "Gypsum or crushed eggshell in planting hole",
      "Avoid high-nitrogen fertilizer mid-season",
    ],
  },
  {
    name: "Mosaic virus",
    remedies: [
      "Remove & destroy affected plants (do not compost)",
      "Control aphid / thrip vectors",
      "Disinfect tools between plants",
    ],
  },
];

export const PNW_DEFICIENCIES: CatalogEntry[] = [
  {
    name: "Nitrogen deficiency",
    remedies: [
      "Fish emulsion (weekly dilute)",
      "Blood meal topdress",
      "Composted chicken manure",
    ],
  },
  {
    name: "Phosphorus deficiency",
    remedies: [
      "Bone meal at planting",
      "Rock phosphate",
      "Finished compost",
    ],
  },
  {
    name: "Potassium deficiency",
    remedies: [
      "Kelp meal / liquid kelp",
      "Wood ash (sparingly)",
      "Greensand",
    ],
  },
  {
    name: "Magnesium deficiency",
    remedies: [
      "Epsom salt foliar spray (1 tbsp / gal)",
      "Dolomite lime in fall",
    ],
  },
  {
    name: "Iron deficiency (chlorosis)",
    remedies: [
      "Chelated iron (EDDHA) drench",
      "Acidify soil for blueberries / rhodies (elemental sulfur)",
      "Test & correct soil pH",
    ],
  },
  {
    name: "Calcium deficiency",
    remedies: [
      "Gypsum topdress",
      "Crushed eggshells tilled in",
      "Consistent watering (calcium moves with water)",
    ],
  },
];

/** Lookup table keyed by catalog entry name → remedies. */
export function getRemediesFor(name: string): string[] {
  const all = [...PNW_PESTS, ...PNW_DISEASES, ...PNW_DEFICIENCIES];
  const hit = all.find((e) => e.name === name);
  return hit?.remedies ?? [];
}

/** Get the full catalog that corresponds to a log type. */
export function getCatalogFor(
  logType: "pest" | "disease" | "deficiency" | "observation"
): CatalogEntry[] {
  if (logType === "pest") return PNW_PESTS;
  if (logType === "disease") return PNW_DISEASES;
  if (logType === "deficiency") return PNW_DEFICIENCIES;
  return [];
}
