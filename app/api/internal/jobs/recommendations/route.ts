import { z } from "zod";

import { failure, invalidPayload, success } from "@/lib/api/response";
import { isAuthorizedInternalJobRequest } from "@/lib/jobs/auth";
import { refreshRecommendationsJob } from "@/lib/jobs/recommendations";
import { createRequestTrace } from "@/lib/observability/request-trace";

const schema = z.object({
  userIds: z.array(z.string()).max(200).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export async function POST(request: Request) {
  const trace = createRequestTrace(request, "jobs.recommendations");
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

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid job payload.", parsed.error.flatten(), trace.requestId);
  }

  const results = await refreshRecommendationsJob(parsed.data);
  trace.complete(200, { outcome: "success", processedUsers: results.length });
  return success({ processedUsers: results.length, results }, { requestId: trace.requestId });
}