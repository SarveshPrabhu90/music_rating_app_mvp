import { RecommendationStatus } from "@prisma/client";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { invalidPayload, rateLimited, success, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { refreshRecommendationsForUser } from "@/lib/jobs/recommendations";
import { createRequestTrace } from "@/lib/observability/request-trace";
import { calculateInitialScore } from "@/lib/ranking/scoring";
import { captureRankingSnapshot } from "@/lib/ranking/snapshots";
import {
  buildRateLimitKey,
  consumeRateLimit,
  resolveRateLimitConfig,
} from "@/lib/security/rate-limit";
import { recommendationActionSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "recommendations.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const persisted = await refreshRecommendationsForUser(userId);

  trace.complete(200, { outcome: "success", recommendationCount: persisted.length });
  return success({ recommendations: persisted }, { requestId: trace.requestId });
}

export async function PATCH(request: Request) {
  const trace = createRequestTrace(request, "recommendations.patch");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const config = resolveRateLimitConfig({
    scope: "RECOMMENDATIONS_PATCH",
    defaultMaxRequests: 30,
    defaultWindowMs: 60_000,
  });
  const limiter = consumeRateLimit({
    key: buildRateLimitKey({ route: "recommendations.patch", userId, request }),
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  });
  if (!limiter.allowed) {
    trace.warn("rate_limit.blocked", {
      scope: "RECOMMENDATIONS_PATCH",
      retryAfterSeconds: limiter.retryAfterSeconds,
    });
    trace.complete(429, { outcome: "rate_limited" });
    return rateLimited({
      requestId: trace.requestId,
      retryAfterSeconds: limiter.retryAfterSeconds,
      details: {
        scope: "RECOMMENDATIONS_PATCH",
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      },
    });
  }

  const parsed = recommendationActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    trace.warn("validation.failed", { issueCount: parsed.error.issues.length });
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid recommendation action.", parsed.error.flatten(), trace.requestId);
  }

  const status = parsed.data.action === "save" ? RecommendationStatus.SAVED : RecommendationStatus.DISMISSED;
  trace.info("ranking.mutation.started", {
    mutation: "recommendation_action",
    trackId: parsed.data.trackId,
    action: parsed.data.action,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.recommendation.updateMany({
        where: {
          userId,
          trackId: parsed.data.trackId,
        },
        data: { status },
      });

      const existing = await tx.userTrackScore.findUnique({
        where: {
          userId_trackId: {
            userId,
            trackId: parsed.data.trackId,
          },
        },
      });

      const delta = parsed.data.action === "save" ? 20 : -24;

      await tx.userTrackScore.upsert({
        where: {
          userId_trackId: {
            userId,
            trackId: parsed.data.trackId,
          },
        },
        update: {
          score: Math.max(120, (existing?.score ?? calculateInitialScore("LIKED")) + delta),
          tier:
            parsed.data.action === "dismiss" && existing?.tier === "LIKED"
              ? "NOT_FOR_ME"
              : existing?.tier,
          lastInteractedAt: new Date(),
        },
        create: {
          userId,
          trackId: parsed.data.trackId,
          tier: parsed.data.action === "save" ? "LIKED" : "NOT_FOR_ME",
          score:
            parsed.data.action === "save"
              ? calculateInitialScore("LIKED", 10)
              : calculateInitialScore("NOT_FOR_ME", 0, -10),
        },
      });

      await captureRankingSnapshot({ tx, userId });
    });

    trace.info("ranking.mutation.completed", {
      mutation: "recommendation_action",
      trackId: parsed.data.trackId,
      action: parsed.data.action,
      status,
    });
    trace.complete(200, { outcome: "success" });
    return success({ updated: true }, { requestId: trace.requestId });
  } catch (error) {
    trace.error("ranking.mutation.failed", error, {
      mutation: "recommendation_action",
      trackId: parsed.data.trackId,
      action: parsed.data.action,
    });
    trace.complete(500, { outcome: "server_error" });
    throw error;
  }
}
