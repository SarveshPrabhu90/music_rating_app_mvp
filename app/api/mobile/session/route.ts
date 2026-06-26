import { z } from "zod";

import { failure, invalidPayload, success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { authorizeCredentials } from "@/lib/auth/credentials";
import {
  createMobileSession,
  readBearerToken,
  revokeMobileSessionToken,
} from "@/lib/auth/mobile-session";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";

const schema = z.object({
  email: z.email().max(120),
  password: z.string().min(8).max(120),
  deviceName: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const trace = createRequestTrace(request, "mobile.session.create");
  trace.info("request.started");

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid mobile session payload.", parsed.error.flatten(), trace.requestId);
  }

  try {
    const user = await authorizeCredentials(parsed.data, request);
    if (!user) {
      trace.complete(401, { outcome: "invalid_credentials" });
      return failure({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
        requestId: trace.requestId,
      });
    }

    const mobileSession = await createMobileSession({
      userId: user.id,
      name: parsed.data.deviceName,
    });

    trace.complete(200, { outcome: "success" });
    return success(
      {
        token: mobileSession.token,
        expiresAt: mobileSession.expiresAt.toISOString(),
        user,
      },
      { requestId: trace.requestId },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_RATE_LIMITED") {
      trace.complete(429, { outcome: "rate_limited" });
      return failure({
        status: 429,
        code: "RATE_LIMITED",
        message: "Too many login attempts. Please try again later.",
        requestId: trace.requestId,
      });
    }

    trace.error("mobile.session.create.failed", error);
    trace.complete(500, { outcome: "server_error" });
    throw error;
  }
}

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "mobile.session.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      privacyDefault: true,
      subscriptionPlan: true,
    },
  });

  trace.complete(200, { outcome: "success" });
  return success({ user }, { requestId: trace.requestId });
}

export async function DELETE(request: Request) {
  const trace = createRequestTrace(request, "mobile.session.delete");
  trace.info("request.started");

  const bearerToken = readBearerToken(request);
  if (!bearerToken) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const revoked = await revokeMobileSessionToken(bearerToken);
  if (!revoked) {
    trace.complete(404, { outcome: "not_found" });
    return failure({
      status: 404,
      code: "SESSION_NOT_FOUND",
      message: "Mobile session not found.",
      requestId: trace.requestId,
    });
  }

  trace.complete(200, { outcome: "success" });
  return success({ revoked: true }, { requestId: trace.requestId });
}