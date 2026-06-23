import { RecommendationStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getPlanRecommendationLimit } from "@/lib/entitlements/plans";
import { buildComparisonCountMap } from "@/lib/ranking/personal-lists";
import { calculateConfidence } from "@/lib/ranking/scoring";
import { buildRecommendations } from "@/lib/recommendations/engine";

type RecommendationDbClient = Pick<
  typeof prisma,
  "track" | "user" | "userTrackScore" | "diaryEntry" | "rankingComparison" | "recommendation"
>;

export async function refreshRecommendationsForUser(
  userId: string,
  db: RecommendationDbClient = prisma,
) {
  const [catalog, scores, diaryEntries] = await Promise.all([
    db.track.findMany(),
    db.userTrackScore.findMany({ where: { userId }, include: { track: true } }),
    db.diaryEntry.findMany({
      where: { userId },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true },
  });

  const loggedTrackIds = new Set(scores.map((score) => score.trackId));
  for (const entry of diaryEntries) loggedTrackIds.add(entry.trackId);

  const tagCount = new Map<string, number>();
  diaryEntries.forEach((entry) =>
    entry.tags.forEach((tag) => {
      tagCount.set(tag.tag.name, (tagCount.get(tag.tag.name) ?? 0) + 1);
    }),
  );
  const frequentTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const comparisons = await db.rankingComparison.findMany({
    where: { userId },
    select: { winnerTrackId: true, loserTrackId: true, delta: true, createdAt: true },
    take: 1200,
    orderBy: { createdAt: "desc" },
  });
  const comparisonCountMap = buildComparisonCountMap(comparisons);

  const generated = buildRecommendations({
    catalog,
    rankedTracks: scores.map((score) => {
      const comparisonCount = comparisonCountMap.get(score.trackId) ?? 0;
      return {
        track: score.track,
        score: score.score,
        tier: score.tier,
        confidence: calculateConfidence(comparisonCount),
        comparisonCount,
      };
    }),
    frequentTags,
    loggedTrackIds,
  });

  const recommendationLimit = getPlanRecommendationLimit(user?.subscriptionPlan);

  return Promise.all(
    generated.slice(0, recommendationLimit).map((item) =>
      db.recommendation.upsert({
        where: { userId_trackId: { userId, trackId: item.track.id } },
        update: { score: item.score, reason: item.reason, status: RecommendationStatus.ACTIVE },
        create: {
          userId,
          trackId: item.track.id,
          score: item.score,
          reason: item.reason,
        },
        include: { track: { include: { artist: true, album: true } } },
      }),
    ),
  );
}

export async function refreshRecommendationsJob({
  userIds,
  limit,
}: {
  userIds?: string[];
  limit?: number;
} = {}) {
  const targetUserIds = userIds?.length
    ? userIds
    : (await prisma.user.findMany({ select: { id: true }, take: limit })).map((user) => user.id);

  const selectedUserIds = typeof limit === "number" ? targetUserIds.slice(0, limit) : targetUserIds;
  const results = [] as Array<{ userId: string; recommendationCount: number }>;

  for (const userId of selectedUserIds) {
    const recommendations = await refreshRecommendationsForUser(userId);
    results.push({ userId, recommendationCount: recommendations.length });
  }

  return results;
}