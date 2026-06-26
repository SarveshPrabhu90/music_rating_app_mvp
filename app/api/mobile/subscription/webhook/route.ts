import { SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { failure, invalidPayload, success } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";

const schema = z.object({
  appUserId: z.string().min(1),
  plan: z.enum(["FREE", "PLUS", "PRO"]),
  source: z.enum(["revenuecat", "manual"]).default("revenuecat"),
});

function isAuthorized(request: Request) {
  const expected = process.env.MOBILE_SUBSCRIPTION_WEBHOOK_SECRET;
  const provided = request.headers.get("x-mobile-subscription-secret");
  return Boolean(expected && provided && expected === provided);
}

export async function POST(request: Request) {
  const trace = createRequestTrace(request, "mobile.subscription_webhook.post");
  trace.info("request.started");

  if (!isAuthorized(request)) {
    trace.complete(401, { outcome: "unauthorized" });
    return failure({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Invalid webhook authorization.",
      requestId: trace.requestId,
    });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid subscription webhook payload.", parsed.error.flatten(), trace.requestId);
  }

  const updated = await prisma.user.updateMany({
    where: { id: parsed.data.appUserId },
    data: { subscriptionPlan: parsed.data.plan as SubscriptionPlan },
  });

  if (!updated.count) {
    trace.complete(404, { outcome: "not_found" });
    return failure({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "No matching user for subscription sync.",
      requestId: trace.requestId,
    });
  }

  trace.complete(200, { outcome: "success", plan: parsed.data.plan, source: parsed.data.source });
  return success({ synced: true }, { requestId: trace.requestId });
}