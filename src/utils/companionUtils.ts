/**
 * Compact companion planting lookup for Zone 8b crops.
 * Keys are lowercase plant names; values are arrays of bad companion names (lowercase).
 */
export const BAD_COMPANIONS: Record<string, string[]> = {
  tomato:    ["fennel", "brassica", "broccoli", "cabbage", "cauliflower", "kale", "potato", "corn"],
  potato:    ["tomato", "fennel", "cucumber", "pumpkin", "squash", "sunflower"],
  fennel:    ["tomato", "pepper", "eggplant", "bean", "pea", "lettuce", "basil", "cilantro"],
  bean:      ["fennel", "onion", "leek", "shallot", "garlic", "beet"],
  pea:       ["fennel", "onion", "leek", "garlic", "shallot"],
  onion:     ["bean", "pea", "sage", "asparagus"],
  garlic:    ["bean", "pea", "sage", "asparagus"],
  leek:      ["bean", "pea"],
  basil:     ["fennel", "sage", "thyme"],
  pepper:    ["fennel", "brassica", "broccoli", "cabbage", "cauliflower", "kale"],
  cucumber:  ["potato", "aromatic herb", "sage", "rosemary"],
  carrot:    ["dill", "fennel", "parsnip"],
  dill:      ["carrot", "tomato", "fennel"],
  beet:      ["bean", "field mustard", "charlock"],
  lettuce:   ["fennel", "parsley"],
  parsley:   ["lettuce", "mint"],
  sunflower: ["potato", "bean"],
  corn:      ["tomato", "celery"],
  strawberry:["brassica", "broccoli", "cabbage", "cauliflower", "kale"],
};

/**
 * Returns names of bad companions found among existingPlants for the given newPlant.
 */
export function findBadCompanions(
  newPlantName: string,
  existingPlantNames: string[]
): string[] {
  const newKey = newPlantName.toLowerCase();
  const conflicts: string[] = [];

  const badForNew = BAD_COMPANIONS[newKey] ?? [];

  for (const existing of existingPlantNames) {
    const existingKey = existing.toLowerCase();
    // New plant considers existing a bad companion
    const newDislikesExisting = badForNew.some((b) => existingKey.includes(b) || b.includes(existingKey));
    // Existing plant considers new plant a bad companion
    const existingDislikesNew = (BAD_COMPANIONS[existingKey] ?? []).some(
      (b) => newKey.includes(b) || b.includes(newKey)
    );
    if (newDislikesExisting || existingDislikesNew) {
      conflicts.push(existing);
    }
  }
  return [...new Set(conflicts)];
}
