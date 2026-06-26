import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { success, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { summarizeTaste } from "@/lib/insights";
import { createRequestTrace } from "@/lib/observability/request-trace";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "taste_profile.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const [scores, entries] = await Promise.all([
    prisma.userTrackScore.findMany({ where: { userId } }),
    prisma.diaryEntry.findMany({
      where: { userId },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const trackIds = [...new Set(scores.map((score) => score.trackId).concat(entries.map((entry) => entry.trackId)))];
  const tracks = await prisma.track.findMany({ where: { id: { in: trackIds } }, include: { artist: true } });

  const insight = summarizeTaste({
    scores,
    entries,
    tracks,
    entryTags: entries.flatMap((entry) => entry.tags),
  });

  trace.complete(200, { outcome: "success" });
  return success(insight, { requestId: trace.requestId });
}
