import { failure, invalidPayload, success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";
import { profileUpdateSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request) {
  const trace = createRequestTrace(request, "profile.patch");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid profile update.", parsed.error.flatten(), trace.requestId);
  }

  const existing = await prisma.user.findFirst({
    where: { username: parsed.data.username, NOT: { id: userId } },
    select: { id: true },
  });
  if (existing) {
    trace.complete(409, { outcome: "username_taken" });
    return failure({
      status: 409,
      code: "USERNAME_TAKEN",
      message: "That username is already taken.",
      requestId: trace.requestId,
    });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      username: parsed.data.username,
      name: parsed.data.name,
      bio: parsed.data.bio || null,
      privacyDefault: parsed.data.privacyDefault,
    },
    select: {
      username: true,
      name: true,
      bio: true,
      privacyDefault: true,
    },
  });

  trace.complete(200, { outcome: "success" });
  return success(updated, { requestId: trace.requestId });
}