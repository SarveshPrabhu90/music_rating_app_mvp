import { failure, success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { createRequestTrace } from "@/lib/observability/request-trace";
import { buildPublicProfileByUsername } from "@/lib/social/profile";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const trace = createRequestTrace(request, "profile.public.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const { username } = await context.params;
  const profile = await buildPublicProfileByUsername(username, userId);
  if (!profile) {
    trace.complete(404, { outcome: "not_found" });
    return failure({
      status: 404,
      code: "PROFILE_NOT_FOUND",
      message: "Profile not found.",
      requestId: trace.requestId,
    });
  }

  trace.complete(200, { outcome: "success" });
  return success(profile, { requestId: trace.requestId });
}