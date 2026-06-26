import { tierLabels } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";
import { buildComparisonCountMap } from "@/lib/ranking/personal-lists";
import { calculateConfidence } from "@/lib/ranking/scoring";

type DashboardDbClient = Pick<
  typeof prisma,
  "diaryEntry" | "userTrackScore" | "recommendation" | "rankingComparison"
>;

export async function buildDashboardSummary(userId: string, db: DashboardDbClient = prisma) {
  const [entries, rankings, recommendations, comparisons] = await Promise.all([
    db.diaryEntry.findMany({
      where: { userId },
      include: { track: { include: { artist: true } }, tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.userTrackScore.findMany({
      where: { userId },
      include: { track: { include: { artist: true } } },
      orderBy: { score: "desc" },
      take: 5,
    }),
    db.recommendation.findMany({
      where: { userId, status: "ACTIVE" },
      include: { track: { include: { artist: true } } },
      orderBy: { score: "desc" },
      take: 1,
    }),
    db.rankingComparison.findMany({
      where: { userId },
      select: { winnerTrackId: true, loserTrackId: true, delta: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1200,
    }),
  ]);

  const comparisonCountMap = buildComparisonCountMap(comparisons);
  const confidenceRows = rankings.map((row) => {
    const comparisonCount = comparisonCountMap.get(row.trackId) ?? 0;
    return {
      comparisonCount,
      confidence: calculateConfidence(comparisonCount),
    };
  });

  const averageConfidence = confidenceRows.length
    ? confidenceRows.reduce((sum, row) => sum + row.confidence, 0) / confidenceRows.length
    : 0;
  const unstableCount = confidenceRows.filter((row) => row.confidence < 0.45).length;
  const topTags = entries.flatMap((entry) => entry.tags.map((tag) => tag.tag.name)).slice(0, 4);

  return {
    recentEntries: entries.map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      tier: entry.tier,
      tierLabel: tierLabels[entry.tier],
      note: entry.note,
      tags: entry.tags.map((tag) => tag.tag.name),
      track: {
        id: entry.track.id,
        title: entry.track.title,
        artistName: entry.track.artist.name,
        albumArtUrl: entry.track.albumArtUrl,
      },
    })),
    topRankings: rankings.map((score, index) => ({
      id: score.id,
      rank: index + 1,
      trackId: score.trackId,
      score: score.score,
      track: {
        id: score.track.id,
        title: score.track.title,
        artistName: score.track.artist.name,
        albumArtUrl: score.track.albumArtUrl,
      },
      comparisonCount: comparisonCountMap.get(score.trackId) ?? 0,
      confidence: calculateConfidence(comparisonCountMap.get(score.trackId) ?? 0),
    })),
    tastePulse: {
      tags: topTags,
      recommendation: recommendations[0]
        ? {
            id: recommendations[0].id,
            score: recommendations[0].score,
            reason: recommendations[0].reason,
            track: {
              id: recommendations[0].track.id,
              title: recommendations[0].track.title,
              artistName: recommendations[0].track.artist.name,
              albumArtUrl: recommendations[0].track.albumArtUrl,
            },
          }
        : null,
      rankingConfidencePercent: Math.round(averageConfidence * 100),
      unstableCount,
    },
  };
}