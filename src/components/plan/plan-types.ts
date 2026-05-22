import type { Exercise } from "@/types/database";

export type PlanDayWithExercises = {
  id: string;
  day_index: number;
  label: string;
  is_rest_day: boolean;
  plan_day_exercises: Array<{
    id: string;
    order_index: number;
    sets: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
    exercise_id: string;
    exercises: Exercise | Exercise[];
  }>;
};
