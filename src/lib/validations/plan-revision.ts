import { z } from "zod";

export const planRevisionSchema = z.object({
  planId: z.string().uuid(),
  revisionNotes: z
    .string()
    .trim()
    .min(1, "Describe what you'd like to change")
    .max(500, "Keep feedback under 500 characters"),
});

export type PlanRevisionInput = z.infer<typeof planRevisionSchema>;
