import { Prisma, RankingEntityType } from "@prisma/client";

import { buildComparisonCountMap, buildRankingLists } from "@/lib/ranking/personal-lists";
import { calculateConfidence, rankingWeight } from "@/lib/ranking/scoring";

const SNAPSHOT_INTERVAL_HOURS = 6;

export async function captureRankingSnapshot({
  tx,
  userId,
  force = false,
}: {
  tx: Prisma.TransactionClient;
  userId: string;
  force?: boolean;
}) {
  const latestSnapshot = await tx.userRankingSnapshot.findFirst({
    where: { userId },
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true },
  });

  const now = new Date();

  if (!force && latestSnapshot) {
    const elapsedMs = now.getTime() - latestSnapshot.capturedAt.getTime();
    const minIntervalMs = SNAPSHOT_INTERVAL_HOURS * 60 * 60 * 1000;

    if (elapsedMs < minIntervalMs) {
      return { captured: false as const, capturedAt: latestSnapshot.capturedAt };
    }
  }

  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [scores, comparisons, monthEntries] = await Promise.all([
    tx.userTrackScore.findMany({
      where: { userId },
      include: { track: { include: { artist: true, album: true } } },
      orderBy: { score: "desc" },
      take: 300,
    }),
    tx.rankingComparison.findMany({
      where: { userId },
      select: { winnerTrackId: true, loserTrackId: true, delta: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1200,
    }),
    tx.diaryEntry.findMany({
      where: { userId, createdAt: { gte: monthStart } },
      include: { track: { select: { genre: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  if (!scores.length) {
    return { captured: false as const, capturedAt: now };
  }

  const comparisonCountMap = buildComparisonCountMap(comparisons);
  const topSongs = [...scores]
    .map((item) => {
      const comparisonCount = comparisonCountMap.get(item.trackId) ?? 0;
      const confidence = calculateConfidence(comparisonCount);
      return {
        trackId: item.trackId,
        score: item.score,
        confidence,
        weightedScore: rankingWeight(item.score, confidence),
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 120);

  const lists = buildRankingLists({
    rankedTracks: scores,
    comparisons,
    monthEntries,
  });

  const capturedAt = new Date();

  await tx.userRankingSnapshot.createMany({
    data: [
      ...topSongs.map((item, index) => ({
        userId,
        entityType: RankingEntityType.TRACK,
        itemId: item.trackId,
        rank: index + 1,
        score: item.score,
        confidence: item.confidence,
        capturedAt,
      })),
      ...lists.topAlbums.slice(0, 80).map((item, index) => ({
        userId,
        entityType: RankingEntityType.ALBUM,
        itemId: item.albumId,
        rank: index + 1,
        score: item.score,
        confidence: item.confidence,
        capturedAt,
      })),
      ...lists.topArtists.slice(0, 80).map((item, index) => ({
        userId,
        entityType: RankingEntityType.ARTIST,
        itemId: item.artistId,
        rank: index + 1,
        score: item.score,
        confidence: item.confidence,
        capturedAt,
      })),
    ],
  });

  return { captured: true as const, capturedAt };
}
