export type WorkoutGoal =
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "general"
  | "athletic_performance";

export type ExerciseModality =
  | "weightlifting"
  | "calisthenics"
  | "cardio"
  | "plyometrics"
  | "stretching";

export type ExerciseCategory = ExerciseModality;

export type Experience = "beginner" | "intermediate" | "advanced";
export type EquipmentAccess = "gym" | "home";
export type SessionStatus = "in_progress" | "completed";

export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_public: boolean;
  bio: string | null;
  timezone: string | null;
  onboarding_completed_at: string | null;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  muscle_group: string;
  equipment: string;
  category: ExerciseCategory;
  technique_md: string;
  youtube_url: string | null;
  difficulty: string;
}

export interface UserOnboarding {
  id: string;
  user_id: string;
  goals: string[];
  exercise_modalities: ExerciseModality[];
  days_per_week: number;
  session_minutes: number;
  experience: string;
  equipment: string;
  injuries_notes: string | null;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  source: string;
  is_active: boolean;
  created_at: string;
}

export interface PlanDay {
  id: string;
  plan_id: string;
  day_index: number;
  label: string;
  is_rest_day: boolean;
}

export interface PlanDayExercise {
  id: string;
  plan_day_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  exercise?: Exercise;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  plan_day_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: SessionStatus;
  expected_duration_seconds?: number | null;
  qualifies_for_streak?: boolean;
  streak_qualify_reasons?: string[];
}

export interface WorkoutLocation {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  created_at: string;
}

export interface SessionLocationSample {
  id: string;
  session_id: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  within_bounds: boolean;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  order_index: number;
  started_at: string;
  exercise?: Exercise;
}

export interface SessionSet {
  id: string;
  session_exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  completed_at: string;
}

export interface UserWeeklyStat {
  user_id: string;
  week_start: string;
  workout_count: number;
  total_volume_kg: number;
}

export interface ScheduledWorkout {
  id: string;
  user_id: string;
  plan_day_id: string | null;
  google_event_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
}

export interface UserIntegration {
  id: string;
  user_id: string;
  provider: string;
  refresh_token: string;
  calendar_id: string | null;
  scopes: string[];
}
