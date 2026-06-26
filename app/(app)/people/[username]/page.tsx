import { notFound } from "next/navigation";

import { AvatarChip } from "@/components/avatar-chip";
import { Card } from "@/components/ui/card";
import { tierLabels } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { areUsersFriends, canViewProfile } from "@/lib/social/friendships";

export default async function PersonProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const viewer = await requireUser();
  const { username } = await params;

  const profile = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      privacyDefault: true,
      createdAt: true,
    },
  });
  if (!profile) {
    notFound();
  }

  const isFriend = await areUsersFriends(viewer.id, profile.id);
  const allowed = canViewProfile({
    viewerUserId: viewer.id,
    profileUserId: profile.id,
    privacyDefault: profile.privacyDefault,
    isFriend,
  });

  if (!allowed) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">@{profile.username}</h1>
        <Card>
          <p className="text-sm text-zinc-600">This profile is only visible to approved friends.</p>
        </Card>
      </div>
    );
  }

  const [recentRatings, topRankings] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { userId: profile.id },
      include: { track: { include: { artist: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.userTrackScore.findMany({
      where: { userId: profile.id },
      include: { track: { include: { artist: true } } },
      orderBy: { score: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-4">
      <section>
        <div className="flex items-start gap-4">
          <AvatarChip name={profile.name} username={profile.username} />
          <div>
            <h1 className="text-3xl font-semibold">{profile.name}</h1>
            <p className="text-sm text-zinc-500">@{profile.username} • Joined {profile.createdAt.toLocaleDateString()}</p>
            <p className="mt-2 text-sm text-zinc-700">{profile.bio || "No bio yet."}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">Recent ratings</h2>
          {recentRatings.length ? (
            recentRatings.map((entry) => (
              <div key={entry.id} className="text-sm">
                <p className="font-medium">{entry.track.title}</p>
                <p className="text-zinc-500">{entry.track.artist.name} • {tierLabels[entry.tier]}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No recent ratings.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Top rankings</h2>
          {topRankings.length ? (
            topRankings.map((score, index) => (
              <div key={score.id} className="text-sm">
                <p className="font-medium">{index + 1}. {score.track.title}</p>
                <p className="text-zinc-500">{score.track.artist.name} • {Math.round(score.score)} pts</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No rankings available.</p>
          )}
        </Card>
      </div>
    </div>
  );
}