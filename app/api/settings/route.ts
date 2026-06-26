import { z } from "zod";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { invalidPayload, success, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";

const schema = z.object({
  privacyDefault: z.enum(["private", "friends", "public"]),
});

export async function PATCH(request: Request) {
  const trace = createRequestTrace(request, "settings.patch");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid payload.", parsed.error.flatten(), trace.requestId);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { privacyDefault: parsed.data.privacyDefault },
  });

  trace.complete(200, { outcome: "success" });
  return success({ saved: true }, { requestId: trace.requestId });
}
