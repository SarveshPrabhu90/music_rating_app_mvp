import { Tier } from "@prisma/client";
import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.email().max(120),
  password: z.string().min(8).max(120),
});

export const diaryEntrySchema = z.object({
  trackId: z.string().min(1),
  tier: z.enum(Tier),
  note: z.string().max(280).optional(),
  tags: z.array(z.string()).max(10),
});

export const updateRankingSchema = z.object({
  trackId: z.string().min(1),
  tier: z.enum(Tier),
});

export const pairwiseSchema = z.object({
  leftTrackId: z.string().min(1),
  rightTrackId: z.string().min(1),
  winnerTrackId: z.string().min(1),
});

export const recommendationActionSchema = z.object({
  trackId: z.string().min(1),
  action: z.enum(["save", "dismiss"]),
});

export const profileUpdateSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(240).optional().or(z.literal("")),
  privacyDefault: z.enum(["private", "friends", "public"]),
});

export const friendRequestSchema = z.object({
  username: z.string().trim().min(3).max(30),
});

export const friendshipActionSchema = z.object({
  action: z.enum(["accept", "decline", "remove", "cancel"]),
});
