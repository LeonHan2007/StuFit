export interface RevisionRules {
  excludeEquipment: string[];
  preferCategories: string[];
}

const EQUIPMENT_ALIASES: Record<string, string[]> = {
  dumbbell: ["dumbbell", "db", "dumbbells"],
  barbell: ["barbell", "bb", "barbells"],
  cable: ["cable", "cables"],
  machine: ["machine", "machines"],
  kettlebell: ["kettlebell", "kettlebells", "kb"],
  bodyweight: ["bodyweight", "bw"],
  band: ["band", "bands", "resistance band"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  cardio: [
    "cardio",
    "conditioning",
    "endurance work",
    "more running",
    "more bike",
    "add cardio",
    "more cardio",
    "add more cardio",
  ],
  calisthenics: ["calisthenics", "bodyweight training"],
  plyometrics: ["plyometric", "plyometrics", "jump training"],
  stretching: ["stretch", "stretching", "mobility", "flexibility"],
  weightlifting: ["more lifting", "more weights", "weightlifting"],
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/['"]/g, "");
}

export function parseRevisionRules(notes: string): RevisionRules {
  const text = normalize(notes);
  const excludeEquipment: string[] = [];

  for (const [equipment, aliases] of Object.entries(EQUIPMENT_ALIASES)) {
    const wantsRemoval =
      aliases.some(
        (alias) =>
          text.includes(`no ${alias}`) ||
          text.includes(`remove ${alias}`) ||
          text.includes(`remove all ${alias}`) ||
          text.includes(`without ${alias}`) ||
          text.includes(`exclude ${alias}`) ||
          text.includes(`replace all ${alias}`) ||
          text.includes(`replace ${alias}`)
      ) ||
      (text.includes("dumbbell") &&
        (text.includes("remove") ||
          text.includes("replace") ||
          text.includes("no ")));

    if (wantsRemoval && !excludeEquipment.includes(equipment)) {
      excludeEquipment.push(equipment);
    }
  }

  const preferCategories: string[] = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      preferCategories.push(category);
    }
  }

  // "add more X" / "incorporate more X" when X is a known category
  const addMoreMatch = text.match(
    /(?:add|incorporate|include)\s+(?:more\s+)?(cardio|calisthenics|plyometrics|stretching|weightlifting)/
  );
  if (addMoreMatch && !preferCategories.includes(addMoreMatch[1])) {
    preferCategories.push(addMoreMatch[1]);
  }

  return { excludeEquipment, preferCategories };
}

/** Modalities allowed when building catalog / adding exercises for a revision. */
export function effectiveModalitiesForRevision(
  params: { exerciseModalities: string[] },
  rules: RevisionRules
): Set<string> {
  const set = new Set(params.exerciseModalities);
  for (const cat of rules.preferCategories) {
    set.add(cat);
  }
  return set;
}

export function hasActionableRevisionRules(rules: RevisionRules): boolean {
  return rules.excludeEquipment.length > 0 || rules.preferCategories.length > 0;
}

export function equipmentMatchesExclude(
  equipment: string,
  excludeEquipment: string[]
): boolean {
  const normalized = equipment.toLowerCase();
  return excludeEquipment.some((ex) => normalized === ex || normalized.includes(ex));
}
