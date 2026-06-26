import { z } from "zod";

import { failure, invalidPayload, success } from "@/lib/api/response";
import { isAuthorizedInternalJobRequest } from "@/lib/jobs/auth";
import { dispatchPushNotificationsJob } from "@/lib/jobs/push-dispatch";
import { createRequestTrace } from "@/lib/observability/request-trace";

const schema = z.object({
  campaign: z.enum(["recommendations", "weekly_recap"]).optional(),
  limit: z.number().int().positive().max(500).optional(),
  sinceHours: z.number().int().positive().max(24 * 14).optional(),
  dryRun: z.boolean().optional(),
});

export async function POST(request: Request) {
  const trace = createRequestTrace(request, "jobs.push_dispatch");
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
    return invalidPayload("Invalid push dispatch payload.", parsed.error.flatten(), trace.requestId);
  }

  const result = await dispatchPushNotificationsJob(parsed.data);
  trace.complete(200, {
    outcome: "success",
    campaign: result.campaign,
    targetedUsers: result.targetedUsers,
    queuedTokens: result.queuedTokens,
    sentCount: result.sentCount,
    failedCount: result.failedCount,
    invalidatedTokens: result.invalidatedTokens,
  });

  return success(result, { requestId: trace.requestId });
}
