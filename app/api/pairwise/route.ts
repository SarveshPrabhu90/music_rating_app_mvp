import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { applyEloComparison, calculateInitialScore } from "@/lib/ranking/scoring";
import { pairwiseSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = pairwiseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid comparison payload." }, { status: 400 });
  }

  const { leftTrackId, rightTrackId, winnerTrackId } = parsed.data;

  if (leftTrackId === rightTrackId) {
    return NextResponse.json({ error: "Tracks must be different." }, { status: 400 });
  }

  const loserTrackId = winnerTrackId === leftTrackId ? rightTrackId : leftTrackId;

  const [winner, loser] = await Promise.all([
    prisma.userTrackScore.findUnique({ where: { userId_trackId: { userId, trackId: winnerTrackId } } }),
    prisma.userTrackScore.findUnique({ where: { userId_trackId: { userId, trackId: loserTrackId } } }),
  ]);

  const winnerScore = winner?.score ?? calculateInitialScore(winner?.tier ?? "LIKED");
  const loserScore = loser?.score ?? calculateInitialScore(loser?.tier ?? "LIKED");

  const elo = applyEloComparison({ winnerScore, loserScore });

  await prisma.$transaction(async (tx) => {
    await tx.userTrackScore.upsert({
      where: { userId_trackId: { userId, trackId: winnerTrackId } },
      update: {
        score: elo.newWinnerScore,
        lastInteractedAt: new Date(),
      },
      create: {
        userId,
        trackId: winnerTrackId,
        tier: winner?.tier ?? "LIKED",
        score: elo.newWinnerScore,
      },
    });

    await tx.userTrackScore.upsert({
      where: { userId_trackId: { userId, trackId: loserTrackId } },
      update: {
        score: elo.newLoserScore,
        lastInteractedAt: new Date(),
      },
      create: {
        userId,
        trackId: loserTrackId,
        tier: loser?.tier ?? "LIKED",
        score: elo.newLoserScore,
      },
    });

    await tx.rankingComparison.create({
      data: {
        userId,
        leftTrackId,
        rightTrackId,
        winnerTrackId,
        loserTrackId,
        delta: elo.delta,
      },
    });
  });

  return NextResponse.json({ ok: true, delta: elo.delta });
}
