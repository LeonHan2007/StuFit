import { z } from "zod";

export const searchUsersSchema = z.object({
  query: z.string().trim().min(1).max(80),
});

export const friendRequestSchema = z.object({
  addresseeId: z.string().uuid(),
});

export const friendshipActionSchema = z.object({
  friendshipId: z.string().uuid(),
});
