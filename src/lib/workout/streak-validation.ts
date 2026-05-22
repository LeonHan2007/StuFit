import { differenceInSeconds, parseISO } from "date-fns";
import type { GeoPoint } from "@/lib/geo/distance";
import { isWithinAnyLocation } from "@/lib/geo/distance";
import {
  formatMinutes,
  reasonableMinimumSeconds,
  type PlanExerciseTiming,
} from "@/lib/workout/workout-duration";

export const LOCATION_SAMPLE_INTERVAL_SECONDS = 60;

export interface PlanExerciseTarget extends PlanExerciseTiming {
  exercise_id: string;
}

export interface SessionExerciseProgress {
  exercise_id: string;
  logged_sets: number;
}

export interface LocationSample {
  within_bounds: boolean;
  recorded_at: string;
}

export interface StreakValidationInput {
  planDayId: string | null;
  startedAt: string;
  endedAt: string;
  planExercises: PlanExerciseTarget[];
  sessionExercises: SessionExerciseProgress[];
  locationSamples: LocationSample[];
  workoutLocations: GeoPoint[];
}

export interface StreakValidationResult {
  qualifies: boolean;
  reasons: string[];
}

export function validateStreakQualification(
  input: StreakValidationInput
): StreakValidationResult {
  const reasons: string[] = [];

  if (!input.planDayId) {
    reasons.push("Workout was not started from your plan");
  }

  if (input.planExercises.length === 0) {
    reasons.push("Plan day has no exercises");
  } else {
    for (const planned of input.planExercises) {
      const progress = input.sessionExercises.find(
        (se) => se.exercise_id === planned.exercise_id
      );
      const logged = progress?.logged_sets ?? 0;
      if (logged < planned.sets) {
        reasons.push(
          `Incomplete: need ${planned.sets} sets for every planned exercise`
        );
        break;
      }
    }
  }

  const durationSeconds = differenceInSeconds(
    parseISO(input.endedAt),
    parseISO(input.startedAt)
  );
  const minDuration = reasonableMinimumSeconds(input.planExercises);
  if (durationSeconds < minDuration) {
    reasons.push(
      `Workout too short (${formatMinutes(durationSeconds)} min; spend a reasonable amount of time — about ${formatMinutes(minDuration)}+ min for this plan)`
    );
  }

  if (input.workoutLocations.length === 0) {
    reasons.push("Add at least one workout location in Accountability settings");
  } else if (input.locationSamples.length === 0) {
    reasons.push("No location check-ins recorded during workout");
  } else {
    const invalidSample = input.locationSamples.find((s) => !s.within_bounds);
    if (invalidSample) {
      reasons.push("Left an approved workout location during the session");
    }

    const minSamples = Math.max(
      1,
      Math.floor(durationSeconds / LOCATION_SAMPLE_INTERVAL_SECONDS)
    );
    if (input.locationSamples.length < minSamples) {
      reasons.push(
        `Not enough location check-ins (${input.locationSamples.length}/${minSamples})`
      );
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    qualifies: uniqueReasons.length === 0,
    reasons: uniqueReasons,
  };
}

export function checkCoordinatesWithinLocations(
  lat: number,
  lon: number,
  locations: GeoPoint[]
): boolean {
  return isWithinAnyLocation(lat, lon, locations);
}
