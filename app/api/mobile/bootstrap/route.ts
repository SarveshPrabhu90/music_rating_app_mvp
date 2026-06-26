import { success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { getPlanFeatures } from "@/lib/entitlements/plans";
import { createRequestTrace } from "@/lib/observability/request-trace";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "mobile.bootstrap.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const [user, ratingCount, rankingCount, friendCount, recommendationCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
        privacyDefault: true,
        subscriptionPlan: true,
      },
    }),
    prisma.diaryEntry.count({ where: { userId } }),
    prisma.userTrackScore.count({ where: { userId } }),
    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    }),
    prisma.recommendation.count({ where: { userId, status: "ACTIVE" } }),
  ]);

  trace.complete(200, { outcome: "success" });
  return success(
    {
      user,
      features: getPlanFeatures(user.subscriptionPlan),
      counts: {
        ratings: ratingCount,
        rankings: rankingCount,
        friends: friendCount,
        recommendations: recommendationCount,
      },
    },
    { requestId: trace.requestId },
  );
}