import Link from "next/link";

import { AvatarChip } from "@/components/avatar-chip";
import { ProfileForm } from "@/components/profile-form";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { tierLabels } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";

export default async function ProfilePage() {
  const user = await requireUser();

  const [profile, recentRatings, topRankings, acceptedCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, username: true, name: true, bio: true, email: true, privacyDefault: true, createdAt: true },
    }),
    prisma.diaryEntry.findMany({
      where: { userId: user.id },
      include: { track: { include: { artist: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.userTrackScore.findMany({
      where: { userId: user.id },
      include: { track: { include: { artist: true } } },
      orderBy: { score: "desc" },
      take: 10,
    }),
    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <AvatarChip name={profile.name} username={profile.username} />
          <div>
            <h1 className="text-3xl font-semibold">Profile</h1>
            <p className="text-sm text-zinc-600">@{profile.username} • {profile.email}</p>
          </div>
        </div>
        <Link href={`/people/${profile.username}`} className="text-sm text-zinc-600 underline">
          View public profile
        </Link>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="space-y-4">
          <ProfileForm initialProfile={profile} />
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm text-zinc-500">Friends</p>
            <p className="text-2xl font-semibold">{acceptedCount}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Joined</p>
            <p className="font-medium">{profile.createdAt.toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Privacy</p>
            <p className="font-medium capitalize">{profile.privacyDefault}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Bio</p>
            <p className="text-sm text-zinc-700">{profile.bio || "No bio yet."}</p>
          </div>
        </Card>
      </div>

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
            <p className="text-sm text-zinc-500">No ratings yet.</p>
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
            <p className="text-sm text-zinc-500">No rankings yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}