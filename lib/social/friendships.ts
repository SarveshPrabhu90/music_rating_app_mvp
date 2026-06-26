import { prisma } from "@/lib/db/prisma";

type FriendshipDbClient = Pick<typeof prisma, "friendship">;

export async function areUsersFriends(
  userId: string,
  otherUserId: string,
  db: FriendshipDbClient = prisma,
) {
  if (userId === otherUserId) {
    return true;
  }

  const friendship = await db.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, addresseeId: otherUserId },
        { requesterId: otherUserId, addresseeId: userId },
      ],
    },
    select: { id: true },
  });

  return Boolean(friendship);
}

export async function getAcceptedFriendIds(userId: string, db: FriendshipDbClient = prisma) {
  const friendships = await db.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  return friendships.map((friendship) =>
    friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId,
  );
}

export function canViewProfile({
  viewerUserId,
  profileUserId,
  privacyDefault,
  isFriend,
}: {
  viewerUserId?: string;
  profileUserId: string;
  privacyDefault: string;
  isFriend: boolean;
}) {
  if (viewerUserId === profileUserId) {
    return true;
  }

  if (privacyDefault === "public") {
    return true;
  }

  if (privacyDefault === "friends") {
    return isFriend;
  }

  return false;
}