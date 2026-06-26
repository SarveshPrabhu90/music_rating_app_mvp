import { success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { buildDashboardSummary } from "@/lib/dashboard/summary";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";
import { buildFriendActivityFeed } from "@/lib/social/feed";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "mobile.dashboard.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const [summary, feedPreview, ratingCount, rankingCount, friendCount] = await Promise.all([
    buildDashboardSummary(userId),
    buildFriendActivityFeed(userId, 5),
    prisma.diaryEntry.count({ where: { userId } }),
    prisma.userTrackScore.count({ where: { userId } }),
    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    }),
  ]);

  trace.complete(200, { outcome: "success" });
  return success(
    {
      summary,
      feedPreview,
      counts: {
        ratings: ratingCount,
        rankings: rankingCount,
        friends: friendCount,
      },
    },
    { requestId: trace.requestId },
  );
}