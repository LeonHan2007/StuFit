import type {
  EquipmentAccess,
  ExerciseModality,
  Experience,
  WorkoutGoal,
} from "@/types/database";

export interface TemplateExerciseSlot {
  slug: string;
  sets?: number;
  repsMin?: number;
  repsMax?: number;
  restSeconds?: number;
}

export interface TemplateDay {
  dayIndex: number;
  label: string;
  exercises: TemplateExerciseSlot[];
}

export interface PlanTemplate {
  name: string;
  days: TemplateDay[];
}

export interface PreviousPlanExerciseSnapshot {
  slug: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
}

export interface PreviousPlanDaySnapshot {
  label: string;
  exercises: PreviousPlanExerciseSnapshot[];
}

export interface PreviousPlanSnapshot {
  planName: string;
  days: PreviousPlanDaySnapshot[];
}

export interface GeneratorParams {
  goals: WorkoutGoal[];
  exerciseModalities: ExerciseModality[];
  daysPerWeek: number;
  sessionMinutes: number;
  experience: Experience;
  equipment: EquipmentAccess;
  injuriesNotes?: string | null;
  revisionNotes?: string | null;
  previousPlan?: PreviousPlanSnapshot | null;
}

export interface RepScheme {
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
}
