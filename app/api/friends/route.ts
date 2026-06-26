import { failure, invalidPayload, success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";
import { friendRequestSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "friends.get");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: { id: true, username: true, name: true, bio: true } },
      addressee: { select: { id: true, username: true, name: true, bio: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    accepted: friendships
      .filter((friendship) => friendship.status === "ACCEPTED")
      .map((friendship) => ({
        id: friendship.id,
        user:
          friendship.requesterId === userId
            ? friendship.addressee
            : friendship.requester,
      })),
    incoming: friendships
      .filter((friendship) => friendship.status === "PENDING" && friendship.addresseeId === userId)
      .map((friendship) => ({ id: friendship.id, user: friendship.requester })),
    outgoing: friendships
      .filter((friendship) => friendship.status === "PENDING" && friendship.requesterId === userId)
      .map((friendship) => ({ id: friendship.id, user: friendship.addressee })),
  };

  trace.complete(200, {
    outcome: "success",
    acceptedCount: data.accepted.length,
    incomingCount: data.incoming.length,
    outgoingCount: data.outgoing.length,
  });
  return success(data, { requestId: trace.requestId });
}

export async function POST(request: Request) {
  const trace = createRequestTrace(request, "friends.create");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const parsed = friendRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid friend request.", parsed.error.flatten(), trace.requestId);
  }

  const target = await prisma.user.findUnique({
    where: { username: parsed.data.username.toLowerCase() },
    select: { id: true, username: true, name: true, bio: true },
  });
  if (!target) {
    trace.complete(404, { outcome: "not_found" });
    return failure({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "No user found for that username.",
      requestId: trace.requestId,
    });
  }

  if (target.id === userId) {
    trace.complete(400, { outcome: "self_request" });
    return failure({
      status: 400,
      code: "INVALID_FRIEND_REQUEST",
      message: "You cannot friend yourself.",
      requestId: trace.requestId,
    });
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    },
    select: { id: true, status: true },
  });
  if (existing) {
    trace.complete(409, { outcome: "duplicate" });
    return failure({
      status: 409,
      code: "FRIENDSHIP_EXISTS",
      message: "A friendship or request already exists.",
      requestId: trace.requestId,
    });
  }

  const friendship = await prisma.friendship.create({
    data: {
      requesterId: userId,
      addresseeId: target.id,
    },
    include: {
      addressee: { select: { id: true, username: true, name: true, bio: true } },
    },
  });

  trace.complete(200, { outcome: "success" });
  return success(
    {
      id: friendship.id,
      user: friendship.addressee,
      status: friendship.status,
    },
    { requestId: trace.requestId },
  );
}