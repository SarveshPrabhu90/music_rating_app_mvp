import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { calculateInitialScore } from "@/lib/ranking/scoring";
import { diaryEntrySchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = diaryEntrySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid diary payload." }, { status: 400 });
  }

  const { trackId, tier, note, tags } = parsed.data;
  const recencyBoost = 15;
  const contextBoost = Math.min(tags.length * 6, 30);

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.diaryEntry.create({
      data: {
        userId,
        trackId,
        tier,
        note,
      },
    });

    const tasteTags = await Promise.all(
      tags.map((name) =>
        tx.tasteTag.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );

    await Promise.all(
      tasteTags.map((tag) =>
        tx.entryTag.upsert({
          where: { entryId_tagId: { entryId: entry.id, tagId: tag.id } },
          update: {},
          create: { entryId: entry.id, tagId: tag.id },
        }),
      ),
    );

    await tx.userTrackScore.upsert({
      where: { userId_trackId: { userId, trackId } },
      update: {
        tier,
        score: { increment: recencyBoost + contextBoost + 12 },
        lastInteractedAt: new Date(),
      },
      create: {
        userId,
        trackId,
        tier,
        score: calculateInitialScore(tier, recencyBoost, contextBoost),
      },
    });

    return entry;
  });

  return NextResponse.json({ ok: true, entryId: result.id });
}
