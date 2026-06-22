import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { summarizeTaste } from "@/lib/insights";

function getWeekStart(date: Date) {
  const base = new Date(date);
  base.setUTCHours(0, 0, 0, 0);
  const day = base.getUTCDay();
  const diff = (day + 6) % 7;
  base.setUTCDate(base.getUTCDate() - diff);
  return base;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = getWeekStart(new Date());
  const entries = await prisma.diaryEntry.findMany({
    where: { userId, createdAt: { gte: weekStart } },
    include: { track: true, tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!entries.length) {
    return NextResponse.json({
      topSong: null,
      topMood: "Discovery",
      topGenre: "Eclectic",
      summary: "Your week is waiting for its first anchor.",
      definingTracks: [],
      nextWeekRecommendations: [],
    });
  }

  const trackIds = [...new Set(entries.map((entry) => entry.trackId))];
  const [scores, tracks, allRecs] = await Promise.all([
    prisma.userTrackScore.findMany({ where: { userId, trackId: { in: trackIds } }, orderBy: { score: "desc" } }),
    prisma.track.findMany({ where: { id: { in: trackIds } }, include: { artist: true } }),
    prisma.recommendation.findMany({ where: { userId, status: "ACTIVE" }, include: { track: true }, orderBy: { score: "desc" }, take: 5 }),
  ]);

  const insight = summarizeTaste({
    scores,
    entries,
    tracks,
    entryTags: entries.flatMap((entry) => entry.tags),
  });

  const topSongId = scores[0]?.trackId ?? entries[0]?.trackId;
  const topSong = tracks.find((track) => track.id === topSongId) ?? null;

  await prisma.weeklyRecap.upsert({
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

  return NextResponse.json({
    topSong,
    topMood: insight.topMood,
    topGenre: insight.topGenre,
    summary: `Your week sounded like ${insight.topMood} ${insight.topGenre}.`,
    definingTracks: tracks.slice(0, 3),
    nextWeekRecommendations: allRecs,
  });
}
