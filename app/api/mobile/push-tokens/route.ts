import { z } from "zod";

import { failure, invalidPayload, success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";

const registerSchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(["ios", "android"]),
});

const deleteSchema = z.object({
  token: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const trace = createRequestTrace(request, "mobile.push_tokens.post");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid push token payload.", parsed.error.flatten(), trace.requestId);
  }

  await prisma.devicePushToken.upsert({
    where: { token: parsed.data.token },
    update: {
      userId,
      platform: parsed.data.platform,
      lastSeenAt: new Date(),
    },
    create: {
      userId,
      token: parsed.data.token,
      platform: parsed.data.platform,
    },
  });

  trace.complete(200, { outcome: "success" });
  return success({ registered: true }, { requestId: trace.requestId });
}

export async function DELETE(request: Request) {
  const trace = createRequestTrace(request, "mobile.push_tokens.delete");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid push token removal payload.", parsed.error.flatten(), trace.requestId);
  }

  const deleted = await prisma.devicePushToken.deleteMany({
    where: {
      userId,
      token: parsed.data.token,
    },
  });

  if (!deleted.count) {
    trace.complete(404, { outcome: "not_found" });
    return failure({
      status: 404,
      code: "PUSH_TOKEN_NOT_FOUND",
      message: "Push token not found.",
      requestId: trace.requestId,
    });
  }

  trace.complete(200, { outcome: "success" });
  return success({ removed: true }, { requestId: trace.requestId });
}