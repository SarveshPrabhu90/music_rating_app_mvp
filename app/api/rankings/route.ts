import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { failure, invalidPayload, rateLimited, success, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";
import { buildComparisonCountMap, buildRankingLists } from "@/lib/ranking/personal-lists";
import { blendTierScore, calculateConfidence, calculateInitialScore } from "@/lib/ranking/scoring";
import { captureRankingSnapshot } from "@/lib/ranking/snapshots";
import {
  buildRateLimitKey,
  consumeRateLimit,
  resolveRateLimitConfig,
} from "@/lib/security/rate-limit";
import { updateRankingSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "rankings.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [scores, comparisons, monthEntries] = await Promise.all([
    prisma.userTrackScore.findMany({
      where: { userId },
      include: { track: { include: { artist: true, album: true } } },
      orderBy: { score: "desc" },
    }),
    prisma.rankingComparison.findMany({
      where: { userId },
      select: {
        winnerTrackId: true,
        loserTrackId: true,
        delta: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1200,
    }),
    prisma.diaryEntry.findMany({
      where: { userId, createdAt: { gte: monthStart } },
      include: { track: { select: { genre: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const lists = buildRankingLists({
    rankedTracks: scores,
    comparisons,
    monthEntries,
  });

  const comparisonCountMap = buildComparisonCountMap(comparisons);
  const trackRankings = scores.map((row, index) => {
    const comparisonCount = comparisonCountMap.get(row.trackId) ?? 0;
    return {
      rank: index + 1,
      trackId: row.trackId,
      score: row.score,
      tier: row.tier,
      confidence: calculateConfidence(comparisonCount),
      comparisonCount,
      track: row.track,
      lastInteractedAt: row.lastInteractedAt,
    };
  });

  trace.complete(200, { outcome: "success", rankingCount: trackRankings.length });
  return success({
    rankings: trackRankings,
    views: {
      topSongs: lists.topSongs,
      topAlbums: lists.topAlbums,
      topArtists: lists.topArtists,
      recentlyRising: lists.recentlyRising,
      thisMonthsSound: lists.thisMonthsSound,
      allTimeAnchors: lists.allTimeAnchors,
    },
  }, { requestId: trace.requestId });
}

export async function PATCH(request: Request) {
  const trace = createRequestTrace(request, "rankings.patch");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const config = resolveRateLimitConfig({
    scope: "RANKINGS_PATCH",
    defaultMaxRequests: 40,
    defaultWindowMs: 60_000,
  });
  const limiter = consumeRateLimit({
    key: buildRateLimitKey({ route: "rankings.patch", userId, request }),
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  });
  if (!limiter.allowed) {
    trace.warn("rate_limit.blocked", {
      scope: "RANKINGS_PATCH",
      retryAfterSeconds: limiter.retryAfterSeconds,
    });
    trace.complete(429, { outcome: "rate_limited" });
    return rateLimited({
      requestId: trace.requestId,
      retryAfterSeconds: limiter.retryAfterSeconds,
      details: {
        scope: "RANKINGS_PATCH",
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      },
    });
  }

  const parsed = updateRankingSchema.safeParse(await request.json());
  if (!parsed.success) {
    trace.warn("validation.failed", { issueCount: parsed.error.issues.length });
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid ranking payload.", parsed.error.flatten(), trace.requestId);
  }

  const { trackId, tier } = parsed.data;
  trace.info("ranking.mutation.started", {
    mutation: "ranking_patch",
    trackId,
    tier,
  });

  const existing = await prisma.userTrackScore.findUnique({
    where: { userId_trackId: { userId, trackId } },
  });

  const nextScore = blendTierScore({
    tier,
    currentScore: existing?.score,
  });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedRow = await tx.userTrackScore.upsert({
        where: { userId_trackId: { userId, trackId } },
        update: {
          tier,
          score: nextScore,
          lastInteractedAt: new Date(),
        },
        create: {
          userId,
          trackId,
          tier,
          score: calculateInitialScore(tier),
        },
      });

      await captureRankingSnapshot({ tx, userId });

      return updatedRow;
    });

    trace.info("ranking.mutation.completed", {
      mutation: "ranking_patch",
      trackId,
      tier,
      score: updated.score,
    });
    trace.complete(200, { outcome: "success" });
    return success({ score: updated.score }, { requestId: trace.requestId });
  } catch (error) {
    trace.error("ranking.mutation.failed", error, {
      mutation: "ranking_patch",
      trackId,
      tier,
    });
    trace.complete(500, { outcome: "server_error" });
    throw error;
  }
}

export async function DELETE(request: Request) {
  const trace = createRequestTrace(request, "rankings.delete");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const config = resolveRateLimitConfig({
    scope: "RANKINGS_DELETE",
    defaultMaxRequests: 20,
    defaultWindowMs: 60_000,
  });
  const limiter = consumeRateLimit({
    key: buildRateLimitKey({ route: "rankings.delete", userId, request }),
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  });
  if (!limiter.allowed) {
    trace.warn("rate_limit.blocked", {
      scope: "RANKINGS_DELETE",
      retryAfterSeconds: limiter.retryAfterSeconds,
    });
    trace.complete(429, { outcome: "rate_limited" });
    return rateLimited({
      requestId: trace.requestId,
      retryAfterSeconds: limiter.retryAfterSeconds,
      details: {
        scope: "RANKINGS_DELETE",
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      },
    });
  }

  const url = new URL(request.url);
  const trackId = url.searchParams.get("trackId");

  if (!trackId) {
    trace.warn("validation.failed", { reason: "missing_track_id" });
    trace.complete(400, { outcome: "missing_track_id" });
    return failure({
      status: 400,
      code: "MISSING_TRACK_ID",
      message: "Missing trackId.",
      requestId: trace.requestId,
    });
  }

  trace.info("ranking.mutation.started", {
    mutation: "ranking_delete",
    trackId,
  });
  await prisma.userTrackScore.deleteMany({ where: { userId, trackId } });

  trace.info("ranking.mutation.completed", {
    mutation: "ranking_delete",
    trackId,
  });
  trace.complete(200, { outcome: "success" });
  return success({ removed: true }, { requestId: trace.requestId });
}
