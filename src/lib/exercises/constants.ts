import type { ExerciseCategory, ExerciseModality } from "@/types/database";

export const EXERCISE_MODALITIES = [
  "weightlifting",
  "calisthenics",
  "cardio",
  "plyometrics",
  "stretching",
] as const satisfies readonly ExerciseModality[];

export const EXERCISE_CATEGORY_ORDER: ExerciseCategory[] = [
  "weightlifting",
  "calisthenics",
  "cardio",
  "plyometrics",
  "stretching",
];

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  weightlifting: "Weightlifting",
  calisthenics: "Calisthenics",
  cardio: "Cardio",
  plyometrics: "Plyometrics",
  stretching: "Stretching",
};

export const HOME_EQUIPMENT = new Set([
  "bodyweight",
  "dumbbell",
  "band",
  "kettlebell",
]);

export function categorySortIndex(category: string): number {
  const idx = EXERCISE_CATEGORY_ORDER.indexOf(category as ExerciseCategory);
  return idx === -1 ? EXERCISE_CATEGORY_ORDER.length : idx;
}

export function sortExercisesByCategory<T extends { category: string; name: string }>(
  exercises: T[]
): T[] {
  return [...exercises].sort((a, b) => {
    const cat = categorySortIndex(a.category) - categorySortIndex(b.category);
    if (cat !== 0) return cat;
    return a.name.localeCompare(b.name);
  });
}
