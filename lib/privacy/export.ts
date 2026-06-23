import { prisma } from "@/lib/db/prisma";

export async function buildUserDataExport(userId: string) {
  const [user, diaryEntries, trackScores, comparisons, recommendations, weeklyRecaps, rankingSnapshots] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          privacyDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.diaryEntry.findMany({
        where: { userId },
        include: {
          track: { include: { artist: true, album: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.userTrackScore.findMany({
        where: { userId },
        include: { track: { include: { artist: true, album: true } } },
        orderBy: { score: "desc" },
      }),
      prisma.rankingComparison.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.recommendation.findMany({
        where: { userId },
        include: { track: { include: { artist: true, album: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.weeklyRecap.findMany({
        where: { userId },
        include: { topSong: { include: { artist: true, album: true } } },
        orderBy: { weekStart: "desc" },
      }),
      prisma.userRankingSnapshot.findMany({
        where: { userId },
        orderBy: { capturedAt: "desc" },
      }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    user,
    diaryEntries,
    trackScores,
    comparisons,
    recommendations,
    weeklyRecaps,
    rankingSnapshots,
  };
}