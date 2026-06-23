import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { success, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getWeekStart } from "@/lib/jobs/weekly-recaps";
import { createRequestTrace } from "@/lib/observability/request-trace";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "weekly_recap.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const weekStart = getWeekStart(new Date());
  const [recap, allRecs, defining] = await Promise.all([
    prisma.weeklyRecap.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
      include: { topSong: true },
    }),
    prisma.recommendation.findMany({
      where: { userId, status: "ACTIVE" },
      include: { track: true },
      orderBy: { score: "desc" },
      take: 5,
    }),
    prisma.diaryEntry.findMany({
      where: { userId, createdAt: { gte: weekStart } },
      include: { track: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  if (!recap) {
    trace.complete(200, { outcome: "empty" });
    return success({
      topSong: null,
      topMood: "Discovery",
      topGenre: "Eclectic",
      summary: "Your week is waiting for its first anchor.",
      definingTracks: [],
      nextWeekRecommendations: [],
    }, { requestId: trace.requestId });
  }

  trace.complete(200, { outcome: "success", recommendationCount: allRecs.length });
  return success({
    topSong: recap.topSong,
    topMood: recap.topMood,
    topGenre: recap.topGenre,
    summary: recap.summary,
    definingTracks: defining.map((entry) => entry.track),
    nextWeekRecommendations: allRecs,
  }, { requestId: trace.requestId });
}
