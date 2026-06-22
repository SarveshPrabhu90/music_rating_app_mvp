import { Tier } from "@prisma/client";

export const tierLabels: Record<Tier, string> = {
  LIFE_SONG: "Life Song",
  ELITE: "Elite",
  HEAVY_ROTATION: "Heavy Rotation",
  LIKED: "Liked",
  NOT_FOR_ME: "Not For Me",
};

export const moodTags = [
  "late night",
  "gym",
  "driving",
  "nostalgia",
  "heartbreak",
  "confidence",
  "focus",
  "party",
  "peaceful",
  "summer",
  "winter",
  "discovery",
] as const;
