import { z } from "zod";
import { EXERCISE_MODALITIES } from "@/lib/exercises/constants";

const goalEnum = z.enum([
  "strength",
  "hypertrophy",
  "endurance",
  "general",
  "athletic_performance",
]);

const modalityEnum = z.enum(EXERCISE_MODALITIES);

export const onboardingSchema = z.object({
  goals: z.array(goalEnum).min(1, "Select at least one goal"),
  exerciseModalities: z
    .array(modalityEnum)
    .min(1, "Select at least one exercise type"),
  daysPerWeek: z.number().int().min(2).max(6),
  sessionMinutes: z.number().int().min(20).max(120),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.enum(["gym", "home"]),
  injuriesNotes: z.string().max(500).optional(),
  retake: z.boolean().optional(),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
