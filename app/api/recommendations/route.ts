import { RecommendationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { buildRecommendations } from "@/lib/recommendations/engine";
import { recommendationActionSchema } from "@/lib/validation/schemas";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [catalog, scores, diaryEntries] = await Promise.all([
    prisma.track.findMany(),
    prisma.userTrackScore.findMany({ where: { userId }, include: { track: true } }),
    prisma.diaryEntry.findMany({
      where: { userId },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

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

  const generated = buildRecommendations({
    catalog,
    rankedTracks: scores.map((score) => ({ track: score.track, score: score.score, tier: score.tier })),
    frequentTags,
    loggedTrackIds,
  });

  const persisted = await Promise.all(
    generated.slice(0, 8).map((item) =>
      prisma.recommendation.upsert({
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

  return NextResponse.json({ recommendations: persisted });
}

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = recommendationActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid recommendation action." }, { status: 400 });
  }

  const status = parsed.data.action === "save" ? RecommendationStatus.SAVED : RecommendationStatus.DISMISSED;

  await prisma.recommendation.updateMany({
    where: {
      userId,
      trackId: parsed.data.trackId,
    },
    data: { status },
  });

  return NextResponse.json({ ok: true });
}
