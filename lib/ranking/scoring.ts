import { Tier } from "@prisma/client";

export const TIER_BASE_SCORES: Record<Tier, number> = {
  LIFE_SONG: 1000,
  ELITE: 850,
  HEAVY_ROTATION: 700,
  LIKED: 550,
  NOT_FOR_ME: 250,
};

export function calculateInitialScore(
  tier: Tier,
  recencyBoost = 0,
  contextBoost = 0,
): number {
  return TIER_BASE_SCORES[tier] + recencyBoost + contextBoost;
}

export function applyEloComparison({
  winnerScore,
  loserScore,
  kFactor = 24,
}: {
  winnerScore: number;
  loserScore: number;
  kFactor?: number;
}) {
  const expectedWinner = 1 / (1 + 10 ** ((loserScore - winnerScore) / 400));
  const expectedLoser = 1 / (1 + 10 ** ((winnerScore - loserScore) / 400));

  const newWinnerScore = winnerScore + kFactor * (1 - expectedWinner);
  const newLoserScore = loserScore + kFactor * (0 - expectedLoser);

  return {
    newWinnerScore,
    newLoserScore,
    delta: newWinnerScore - winnerScore,
  };
}
