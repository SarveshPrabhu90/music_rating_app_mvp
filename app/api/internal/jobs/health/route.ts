import { success, failure } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { isAuthorizedInternalJobRequest } from "@/lib/jobs/auth";
import { getWeekStart } from "@/lib/jobs/weekly-recaps";
import { createRequestTrace } from "@/lib/observability/request-trace";

const RECOMMENDATION_FRESHNESS_HOURS = 24;
const WEEKLY_RECAP_MIN_COUNT = 1;

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "jobs.health");
  trace.info("request.started");

  const authorization = isAuthorizedInternalJobRequest(request);
  if (!authorization.ok) {
    trace.complete(authorization.status, { outcome: authorization.code.toLowerCase() });
    return failure({
      status: authorization.status,
      code: authorization.code,
      message: authorization.message,
      requestId: trace.requestId,
    });
  }

  const now = new Date();
  const recommendationThreshold = new Date(now.getTime() - RECOMMENDATION_FRESHNESS_HOURS * 60 * 60 * 1000);
  const weekStart = getWeekStart(now);

  const [userCount, recommendations24h, weeklyRecapsCurrentWeek, latestRecommendation, latestWeeklyRecap] =
    await Promise.all([
      prisma.user.count(),
      prisma.recommendation.count({ where: { createdAt: { gte: recommendationThreshold } } }),
      prisma.weeklyRecap.count({ where: { weekStart } }),
      prisma.recommendation.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.weeklyRecap.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, weekStart: true } }),
    ]);

  const checks = [
    {
      name: "recommendations_freshness_24h",
      ok: recommendations24h > 0,
      detail:
        recommendations24h > 0
          ? `Found ${recommendations24h} recommendations created in the last ${RECOMMENDATION_FRESHNESS_HOURS}h.`
          : `No recommendations created in the last ${RECOMMENDATION_FRESHNESS_HOURS}h.`,
    },
    {
      name: "weekly_recaps_current_week",
      ok: weeklyRecapsCurrentWeek >= WEEKLY_RECAP_MIN_COUNT,
      detail:
        weeklyRecapsCurrentWeek >= WEEKLY_RECAP_MIN_COUNT
          ? `Found ${weeklyRecapsCurrentWeek} weekly recap rows for ${weekStart.toISOString().slice(0, 10)}.`
          : `No weekly recaps found for ${weekStart.toISOString().slice(0, 10)}.`,
    },
  ];

  const overallOk = checks.every((check) => check.ok);
  const status = overallOk ? 200 : 503;

  trace.complete(status, {
    outcome: overallOk ? "healthy" : "unhealthy",
    userCount,
    recommendations24h,
    weeklyRecapsCurrentWeek,
  });

  return success(
    {
      status: overallOk ? "ok" : "degraded",
      generatedAt: now.toISOString(),
      summary: {
        users: userCount,
        recommendations24h,
        weeklyRecapsCurrentWeek,
      },
      latest: {
        recommendationCreatedAt: latestRecommendation?.createdAt.toISOString() ?? null,
        weeklyRecapCreatedAt: latestWeeklyRecap?.createdAt.toISOString() ?? null,
        weeklyRecapWeekStart: latestWeeklyRecap?.weekStart.toISOString() ?? null,
      },
      checks,
    },
    { status, requestId: trace.requestId },
  );
}
