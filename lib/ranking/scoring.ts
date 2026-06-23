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

export function calculateConfidence(comparisonCount: number): number {
  if (comparisonCount <= 0) return 0;
  return Math.min(0.98, comparisonCount / (comparisonCount + 6));
}

export function calculateAdaptiveKFactor({
  leftComparisonCount,
  rightComparisonCount,
}: {
  leftComparisonCount: number;
  rightComparisonCount: number;
}): number {
  const leftConfidence = calculateConfidence(leftComparisonCount);
  const rightConfidence = calculateConfidence(rightComparisonCount);
  const averageConfidence = (leftConfidence + rightConfidence) / 2;

  return Math.max(12, Math.round(36 - averageConfidence * 22));
}

export function blendTierScore({
  tier,
  currentScore,
}: {
  tier: Tier;
  currentScore?: number;
}): number {
  const target = calculateInitialScore(tier);
  if (typeof currentScore !== "number") return target;

  return currentScore * 0.72 + target * 0.28;
}

export function rankingWeight(score: number, confidence: number): number {
  return score * (0.65 + confidence * 0.35);
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
