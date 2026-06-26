import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { success, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "catalog.search");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const tracks = await prisma.track.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q } },
            { genre: { contains: q } },
            { artist: { name: { contains: q } } },
            { album: { title: { contains: q } } },
          ],
        }
      : undefined,
    include: { artist: true, album: true },
    take: 20,
  });

  trace.complete(200, { outcome: "success", trackCount: tracks.length });
  return success({ tracks }, { requestId: trace.requestId });
}
