import { z } from "zod";

export const setLogSchema = z.object({
  weightKg: z.number().min(0).max(500),
  reps: z.number().int().min(0).max(100),
  rpe: z.number().min(1).max(10).optional().nullable(),
});

export type SetLogValues = z.infer<typeof setLogSchema>;
