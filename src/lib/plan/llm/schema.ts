import { z } from "zod";

export const llmExerciseSlotSchema = z.object({
  slug: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  repsMin: z.number().int().min(1).max(600),
  repsMax: z.number().int().min(1).max(600),
  restSeconds: z.number().int().min(0).max(600),
});

export const llmPlanDaySchema = z
  .object({
    label: z.string().min(1).max(80),
    isRestDay: z.boolean().optional(),
    exercises: z.array(llmExerciseSlotSchema).max(20),
  })
  .superRefine((day, ctx) => {
    if (day.isRestDay) {
      if (day.exercises.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: "Rest days must have no exercises",
          path: ["exercises"],
        });
      }
      return;
    }
    if (day.exercises.length < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Training days need at least one exercise",
        path: ["exercises"],
      });
    }
  });

export const llmWorkoutPlanSchema = z.object({
  planName: z.string().min(1).max(100),
  days: z.array(llmPlanDaySchema).length(7),
});

export type LlmWorkoutPlan = z.infer<typeof llmWorkoutPlanSchema>;
export type LlmExerciseSlot = z.infer<typeof llmExerciseSlotSchema>;
