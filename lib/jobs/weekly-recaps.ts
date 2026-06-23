import { prisma } from "@/lib/db/prisma";
import { summarizeTaste } from "@/lib/insights";

type WeeklyRecapDbClient = Pick<
  typeof prisma,
  "user" | "diaryEntry" | "userTrackScore" | "track" | "weeklyRecap"
>;

export function getWeekStart(date: Date) {
  const base = new Date(date);
  base.setUTCHours(0, 0, 0, 0);
  const day = base.getUTCDay();
  const diff = (day + 6) % 7;
  base.setUTCDate(base.getUTCDate() - diff);
  return base;
}

export async function generateWeeklyRecapForUser(
  userId: string,
  db: WeeklyRecapDbClient = prisma,
  now = new Date(),
) {
  const weekStart = getWeekStart(now);
  const entries = await db.diaryEntry.findMany({
    where: { userId, createdAt: { gte: weekStart } },
    include: { track: true, tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!entries.length) {
    return null;
  }

  const trackIds = [...new Set(entries.map((entry) => entry.trackId))];
  const [scores, tracks] = await Promise.all([
    db.userTrackScore.findMany({ where: { userId, trackId: { in: trackIds } }, orderBy: { score: "desc" } }),
    db.track.findMany({ where: { id: { in: trackIds } }, include: { artist: true } }),
  ]);

  const insight = summarizeTaste({
    scores,
    entries,
    tracks,
    entryTags: entries.flatMap((entry) => entry.tags),
  });

  const topSongId = scores[0]?.trackId ?? entries[0]?.trackId;
  const topSong = tracks.find((track) => track.id === topSongId) ?? null;

  return db.weeklyRecap.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {
      topSongId: topSong?.id,
      topMood: insight.topMood,
      topGenre: insight.topGenre,
      summary: `This week sounded like ${insight.topMood} ${insight.topGenre}.`,
    },
    create: {
      userId,
      weekStart,
      topSongId: topSong?.id,
      topMood: insight.topMood,
      topGenre: insight.topGenre,
      summary: `This week sounded like ${insight.topMood} ${insight.topGenre}.`,
    },
  });
}

export async function generateWeeklyRecapsJob({
  userIds,
  limit,
  now,
}: {
  userIds?: string[];
  limit?: number;
  now?: Date;
} = {}) {
  const targetUserIds = userIds?.length
    ? userIds
    : (await prisma.user.findMany({ select: { id: true }, take: limit })).map((user) => user.id);

  const selectedUserIds = typeof limit === "number" ? targetUserIds.slice(0, limit) : targetUserIds;
  const results = [] as Array<{ userId: string; generated: boolean }>;

  for (const userId of selectedUserIds) {
    const recap = await generateWeeklyRecapForUser(userId, prisma, now);
    results.push({ userId, generated: Boolean(recap) });
  }

  return results;
}