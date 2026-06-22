import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { summarizeTaste } from "@/lib/insights";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [scores, entries] = await Promise.all([
    prisma.userTrackScore.findMany({ where: { userId } }),
    prisma.diaryEntry.findMany({
      where: { userId },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const trackIds = [...new Set(scores.map((score) => score.trackId).concat(entries.map((entry) => entry.trackId)))];
  const tracks = await prisma.track.findMany({ where: { id: { in: trackIds } }, include: { artist: true } });

  const insight = summarizeTaste({
    scores,
    entries,
    tracks,
    entryTags: entries.flatMap((entry) => entry.tags),
  });

  return NextResponse.json(insight);
}
