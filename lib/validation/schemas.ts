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
