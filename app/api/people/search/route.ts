import { success, unauthorized } from "@/lib/api/response";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "people.search");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      OR: query
        ? [
            { username: { contains: query } },
            { name: { contains: query } },
          ]
        : undefined,
    },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      privacyDefault: true,
    },
    orderBy: [{ name: "asc" }],
    take: 12,
  });

  const friendships = users.length
    ? await prisma.friendship.findMany({
        where: {
          OR: [
            { requesterId: userId, addresseeId: { in: users.map((user) => user.id) } },
            { requesterId: { in: users.map((user) => user.id) }, addresseeId: userId },
          ],
        },
        select: {
          id: true,
          requesterId: true,
          addresseeId: true,
          status: true,
        },
      })
    : [];

  const relationshipByUserId = new Map(
    friendships.map((friendship) => [
      friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId,
      friendship,
    ]),
  );

  const results = users.map((user) => {
    const friendship = relationshipByUserId.get(user.id);
    let relationship = "none" as "none" | "friends" | "incoming" | "outgoing";

    if (friendship?.status === "ACCEPTED") {
      relationship = "friends";
    } else if (friendship?.requesterId === userId) {
      relationship = "outgoing";
    } else if (friendship) {
      relationship = "incoming";
    }

    return {
      ...user,
      relationship,
      friendshipId: friendship?.id ?? null,
    };
  });

  trace.complete(200, { outcome: "success", resultCount: results.length });
  return success({ results }, { requestId: trace.requestId });
}