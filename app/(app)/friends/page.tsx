import Link from "next/link";

import { FriendsManager } from "@/components/friends-manager";
import { PeopleDiscovery } from "@/components/people-discovery";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function FriendsPage() {
  const user = await requireUser();

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
    include: {
      requester: { select: { id: true, username: true, name: true, bio: true } },
      addressee: { select: { id: true, username: true, name: true, bio: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const accepted = friendships
    .filter((friendship) => friendship.status === "ACCEPTED")
    .map((friendship) => ({
      id: friendship.id,
      user: friendship.requesterId === user.id ? friendship.addressee : friendship.requester,
    }));
  const incoming = friendships
    .filter((friendship) => friendship.status === "PENDING" && friendship.addresseeId === user.id)
    .map((friendship) => ({ id: friendship.id, user: friendship.requester }));
  const outgoing = friendships
    .filter((friendship) => friendship.status === "PENDING" && friendship.requesterId === user.id)
    .map((friendship) => ({ id: friendship.id, user: friendship.addressee }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Friends</h1>
          <p className="text-sm text-zinc-600">Manage requests, explore profiles, and grow your taste network.</p>
        </div>
        <Link href="/feed" className="text-sm text-zinc-600 underline">
          View feed
        </Link>
      </div>
      <Card>
        <FriendsManager initialAccepted={accepted} initialIncoming={incoming} initialOutgoing={outgoing} />
      </Card>
      <Card>
        <div className="mb-4">
          <h2 className="font-semibold">Discover people</h2>
          <p className="text-sm text-zinc-500">Search by name or username to find new people to follow and compare taste with.</p>
        </div>
        <PeopleDiscovery />
      </Card>
    </div>
  );
}