import { success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { buildDashboardSummary } from "@/lib/dashboard/summary";
import { createRequestTrace } from "@/lib/observability/request-trace";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "dashboard.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const summary = await buildDashboardSummary(userId);
  trace.complete(200, {
    outcome: "success",
    recentEntryCount: summary.recentEntries.length,
    topRankingCount: summary.topRankings.length,
  });
  return success(summary, { requestId: trace.requestId });
}