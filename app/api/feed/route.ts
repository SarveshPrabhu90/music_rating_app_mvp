import { success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { buildFriendActivityFeed } from "@/lib/social/feed";
import { createRequestTrace } from "@/lib/observability/request-trace";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "feed.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const items = await buildFriendActivityFeed(userId);
  trace.complete(200, { outcome: "success", itemCount: items.length });
  return success({ items }, { requestId: trace.requestId });
}