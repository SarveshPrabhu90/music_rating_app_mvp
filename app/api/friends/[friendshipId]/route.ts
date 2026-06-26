import { failure, invalidPayload, success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";
import { friendshipActionSchema } from "@/lib/validation/schemas";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ friendshipId: string }> },
) {
  const trace = createRequestTrace(request, "friends.patch");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const { friendshipId } = await context.params;
  const parsed = friendshipActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid friendship action.", parsed.error.flatten(), trace.requestId);
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) {
    trace.complete(404, { outcome: "not_found" });
    return failure({
      status: 404,
      code: "FRIENDSHIP_NOT_FOUND",
      message: "Friendship not found.",
      requestId: trace.requestId,
    });
  }

  const isParticipant = friendship.requesterId === userId || friendship.addresseeId === userId;
  if (!isParticipant) {
    trace.complete(403, { outcome: "forbidden" });
    return failure({
      status: 403,
      code: "FORBIDDEN",
      message: "You cannot modify this friendship.",
      requestId: trace.requestId,
    });
  }

  if (parsed.data.action === "accept") {
    if (friendship.addresseeId !== userId) {
      trace.complete(403, { outcome: "forbidden" });
      return failure({
        status: 403,
        code: "FORBIDDEN",
        message: "Only the invited user can accept this request.",
        requestId: trace.requestId,
      });
    }

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: "ACCEPTED" },
      select: { id: true, status: true },
    });
    trace.complete(200, { outcome: "success", action: "accept" });
    return success(updated, { requestId: trace.requestId });
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });
  trace.complete(200, { outcome: "success", action: parsed.data.action });
  return success({ removed: true }, { requestId: trace.requestId });
}