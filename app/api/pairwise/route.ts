import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { failure, invalidPayload, rateLimited, success, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";
import {
  buildRateLimitKey,
  consumeRateLimit,
  resolveRateLimitConfig,
} from "@/lib/security/rate-limit";
import {
  applyEloComparison,
  calculateAdaptiveKFactor,
  calculateConfidence,
  calculateInitialScore,
} from "@/lib/ranking/scoring";
import { captureRankingSnapshot } from "@/lib/ranking/snapshots";
import { pairwiseSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const trace = createRequestTrace(request, "pairwise.create");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const config = resolveRateLimitConfig({
    scope: "PAIRWISE",
    defaultMaxRequests: 80,
    defaultWindowMs: 60_000,
  });
  const limiter = consumeRateLimit({
    key: buildRateLimitKey({ route: "pairwise.create", userId, request }),
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  });
  if (!limiter.allowed) {
    trace.warn("rate_limit.blocked", {
      scope: "PAIRWISE",
      retryAfterSeconds: limiter.retryAfterSeconds,
    });
    trace.complete(429, { outcome: "rate_limited" });
    return rateLimited({
      requestId: trace.requestId,
      retryAfterSeconds: limiter.retryAfterSeconds,
      details: {
        scope: "PAIRWISE",
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      },
    });
  }

  const parsed = pairwiseSchema.safeParse(await request.json());
  if (!parsed.success) {
    trace.warn("validation.failed", { issueCount: parsed.error.issues.length });
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid comparison payload.", parsed.error.flatten(), trace.requestId);
  }

  const { leftTrackId, rightTrackId, winnerTrackId } = parsed.data;

  if (leftTrackId === rightTrackId) {
    trace.warn("validation.failed", { reason: "same_track", trackId: leftTrackId });
    trace.complete(400, { outcome: "invalid_comparison" });
    return failure({
      status: 400,
      code: "INVALID_COMPARISON",
      message: "Tracks must be different.",
      requestId: trace.requestId,
    });
  }

  trace.info("ranking.mutation.started", {
    mutation: "pairwise_comparison",
    leftTrackId,
    rightTrackId,
    winnerTrackId,
  });

  const loserTrackId = winnerTrackId === leftTrackId ? rightTrackId : leftTrackId;

  const [winner, loser] = await Promise.all([
    prisma.userTrackScore.findUnique({ where: { userId_trackId: { userId, trackId: winnerTrackId } } }),
    prisma.userTrackScore.findUnique({ where: { userId_trackId: { userId, trackId: loserTrackId } } }),
  ]);

  const [winnerComparisonCount, loserComparisonCount] = await Promise.all([
    prisma.rankingComparison.count({
      where: {
        userId,
        OR: [{ winnerTrackId }, { loserTrackId: winnerTrackId }],
      },
    }),
    prisma.rankingComparison.count({
      where: {
        userId,
        OR: [{ winnerTrackId: loserTrackId }, { loserTrackId }],
      },
    }),
  ]);

  const winnerScore = winner?.score ?? calculateInitialScore(winner?.tier ?? "LIKED");
  const loserScore = loser?.score ?? calculateInitialScore(loser?.tier ?? "LIKED");
  const kFactor = calculateAdaptiveKFactor({
    leftComparisonCount: winnerComparisonCount,
    rightComparisonCount: loserComparisonCount,
  });

  const elo = applyEloComparison({ winnerScore, loserScore, kFactor });

  try {
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

      await captureRankingSnapshot({ tx, userId });
    });

    trace.info("ranking.mutation.completed", {
      mutation: "pairwise_comparison",
      winnerTrackId,
      loserTrackId,
      delta: elo.delta,
      kFactor,
    });
    trace.complete(200, { outcome: "success" });
    return success(
      {
        delta: elo.delta,
        kFactor,
        winnerConfidence: calculateConfidence(winnerComparisonCount + 1),
        loserConfidence: calculateConfidence(loserComparisonCount + 1),
      },
      { requestId: trace.requestId },
    );
  } catch (error) {
    trace.error("ranking.mutation.failed", error, {
      mutation: "pairwise_comparison",
      leftTrackId,
      rightTrackId,
      winnerTrackId,
    });
    trace.complete(500, { outcome: "server_error" });
    throw error;
  }
}
