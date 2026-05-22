/** Rough seconds of active work per logged set. */
const SECONDS_PER_SET_WORK = 45;
/** Time to move between exercises. */
const TRANSITION_BETWEEN_EXERCISES_SECONDS = 90;
/** Minimum time that still counts as a real session. */
const FLOOR_SECONDS = 12 * 60;
/** Fraction of estimated plan time considered "reasonable". */
const REASONABLE_FRACTION = 0.6;

export interface PlanExerciseTiming {
  sets: number;
  rest_seconds: number;
}

export function estimatePlanWorkoutSeconds(
  exercises: PlanExerciseTiming[]
): number {
  if (exercises.length === 0) return 25 * 60;

  const exerciseTime = exercises.reduce((sum, ex) => {
    const work = ex.sets * SECONDS_PER_SET_WORK;
    const rest = Math.max(0, ex.sets - 1) * ex.rest_seconds;
    return sum + work + rest;
  }, 0);

  const transitions =
    Math.max(0, exercises.length - 1) * TRANSITION_BETWEEN_EXERCISES_SECONDS;

  return exerciseTime + transitions;
}

/** Minimum duration that counts as spending a reasonable amount of time. */
export function reasonableMinimumSeconds(
  planExercises: PlanExerciseTiming[]
): number {
  const estimated = estimatePlanWorkoutSeconds(planExercises);
  const fromPlan = Math.floor(estimated * REASONABLE_FRACTION);
  return Math.max(FLOOR_SECONDS, Math.min(fromPlan, estimated));
}

export function formatMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}
