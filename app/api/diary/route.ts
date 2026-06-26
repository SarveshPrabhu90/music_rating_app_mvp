import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { invalidPayload, rateLimited, success, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";
import { calculateInitialScore } from "@/lib/ranking/scoring";
import { captureRankingSnapshot } from "@/lib/ranking/snapshots";
import { buildRateLimitKey, consumeRateLimit, resolveRateLimitConfig } from "@/lib/security/rate-limit";
import { diaryEntrySchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const trace = createRequestTrace(request, "diary.create");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const config = resolveRateLimitConfig({
    scope: "DIARY",
    defaultMaxRequests: 30,
    defaultWindowMs: 60_000,
  });
  const limiter = consumeRateLimit({
    key: buildRateLimitKey({ route: "diary.create", userId, request }),
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  });
  if (!limiter.allowed) {
    trace.warn("rate_limit.blocked", {
      scope: "DIARY",
      retryAfterSeconds: limiter.retryAfterSeconds,
    });
    trace.complete(429, { outcome: "rate_limited" });
    return rateLimited({
      requestId: trace.requestId,
      retryAfterSeconds: limiter.retryAfterSeconds,
      details: {
        scope: "DIARY",
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      },
    });
  }

  const parsed = diaryEntrySchema.safeParse(await request.json());
  if (!parsed.success) {
    trace.warn("validation.failed", { issueCount: parsed.error.issues.length });
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid diary payload.", parsed.error.flatten(), trace.requestId);
  }

  const { trackId, tier, note, tags } = parsed.data;
  trace.info("ranking.mutation.started", {
    mutation: "diary_entry",
    trackId,
    tier,
    tagCount: tags.length,
    hasNote: Boolean(note?.trim()),
  });

  const recencyBoost = 15;
  const contextBoost = Math.min(tags.length * 6, 30);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingScore = await tx.userTrackScore.findUnique({
        where: { userId_trackId: { userId, trackId } },
      });

      const existingRankedCount = await tx.userTrackScore.count({
        where: {
          userId,
          trackId: { not: trackId },
        },
      });

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

      const updatedScore = await tx.userTrackScore.upsert({
        where: { userId_trackId: { userId, trackId } },
        update: {
          tier,
          score:
            (existingScore?.score ?? calculateInitialScore(tier, recencyBoost, contextBoost)) +
            recencyBoost +
            contextBoost +
            12,
          lastInteractedAt: new Date(),
        },
        create: {
          userId,
          trackId,
          tier,
          score: calculateInitialScore(tier, recencyBoost, contextBoost),
        },
      });

      await captureRankingSnapshot({ tx, userId });

      return {
        entryId: entry.id,
        score: updatedScore.score,
        shouldPromptPlacement: existingRankedCount > 0,
      };
    });

    trace.info("ranking.mutation.completed", {
      mutation: "diary_entry",
      trackId,
      score: result.score,
      shouldPromptPlacement: result.shouldPromptPlacement,
    });
    trace.complete(200, { outcome: "success" });
    return success(result, { requestId: trace.requestId });
  } catch (error) {
    trace.error("ranking.mutation.failed", error, {
      mutation: "diary_entry",
      trackId,
    });
    trace.complete(500, { outcome: "server_error" });
    throw error;
  }
}
