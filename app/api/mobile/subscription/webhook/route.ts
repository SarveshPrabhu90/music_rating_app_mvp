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

const revenueCatSchema = z.object({
  event: z.object({
    app_user_id: z.string().min(1),
    type: z.string().min(1),
    entitlement_ids: z.array(z.string()).optional(),
    product_id: z.string().optional(),
  }),
});

function parseList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePlanFromRevenueCat(event: z.infer<typeof revenueCatSchema>["event"]) {
  const normalizedType = event.type.toUpperCase();
  if (["CANCELLATION", "EXPIRATION", "BILLING_ISSUE", "UNCANCELLATION_REVERTED"].includes(normalizedType)) {
    return SubscriptionPlan.FREE;
  }

  const proProducts = parseList(process.env.REVENUECAT_PRO_PRODUCT_IDS);
  const plusProducts = parseList(process.env.REVENUECAT_PLUS_PRODUCT_IDS);
  const proEntitlements = parseList(process.env.REVENUECAT_PRO_ENTITLEMENTS);
  const plusEntitlements = parseList(process.env.REVENUECAT_PLUS_ENTITLEMENTS);

  if (event.product_id && proProducts.includes(event.product_id)) {
    return SubscriptionPlan.PRO;
  }
  if (event.product_id && plusProducts.includes(event.product_id)) {
    return SubscriptionPlan.PLUS;
  }
  if (event.entitlement_ids?.some((entitlement) => proEntitlements.includes(entitlement))) {
    return SubscriptionPlan.PRO;
  }
  if (event.entitlement_ids?.some((entitlement) => plusEntitlements.includes(entitlement))) {
    return SubscriptionPlan.PLUS;
  }

  return SubscriptionPlan.FREE;
}

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

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  const revenueCatParsed = revenueCatSchema.safeParse(payload);

  if (!parsed.success && !revenueCatParsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload(
      "Invalid subscription webhook payload.",
      {
        direct: parsed.success ? undefined : parsed.error.flatten(),
        revenuecat: revenueCatParsed.success ? undefined : revenueCatParsed.error.flatten(),
      },
      trace.requestId,
    );
  }

  const directPayload = parsed.success ? parsed.data : null;
  const revenueCatPayload = revenueCatParsed.success ? revenueCatParsed.data : null;

  const appUserId = directPayload ? directPayload.appUserId : revenueCatPayload!.event.app_user_id;
  const plan = directPayload
    ? (directPayload.plan as SubscriptionPlan)
    : resolvePlanFromRevenueCat(revenueCatPayload!.event);
  const source = directPayload ? directPayload.source : "revenuecat";

  const updated = await prisma.user.updateMany({
    where: { id: appUserId },
    data: { subscriptionPlan: plan },
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

  trace.complete(200, { outcome: "success", plan, source });
  return success({ synced: true }, { requestId: trace.requestId });
}