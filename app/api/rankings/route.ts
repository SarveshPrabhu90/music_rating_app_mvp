import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { calculateInitialScore } from "@/lib/ranking/scoring";
import { updateRankingSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateRankingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ranking payload." }, { status: 400 });
  }

  const { trackId, tier } = parsed.data;

  await prisma.userTrackScore.upsert({
    where: { userId_trackId: { userId, trackId } },
    update: {
      tier,
      score: calculateInitialScore(tier),
      lastInteractedAt: new Date(),
    },
    create: {
      userId,
      trackId,
      tier,
      score: calculateInitialScore(tier),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const trackId = url.searchParams.get("trackId");

  if (!trackId) {
    return NextResponse.json({ error: "Missing trackId." }, { status: 400 });
  }

  await prisma.userTrackScore.deleteMany({ where: { userId, trackId } });

  return NextResponse.json({ ok: true });
}
