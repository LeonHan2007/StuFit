import { z } from "zod";
import { normalizeUsername, validateUsername } from "@/lib/profile/username";

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .superRefine((val, ctx) => {
    const err = validateUsername(val);
    if (err) ctx.addIssue({ code: "custom", message: err });
  });

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().max(300).optional().nullable(),
  timezone: z.string().min(1).max(64).optional(),
  username: usernameSchema.optional(),
});

export const checkUsernameSchema = z.object({
  username: usernameSchema,
});

export const togglePrivacySchema = z.object({
  isPublic: z.boolean(),
});

export const avatarUrlSchema = z.object({
  avatarUrl: z.string().url().nullable(),
});
