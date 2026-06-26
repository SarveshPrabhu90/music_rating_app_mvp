import { tierLabels } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";
import { areUsersFriends, canViewProfile } from "@/lib/social/friendships";

export async function buildPublicProfileByUsername(username: string, viewerUserId: string) {
  const profile = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      privacyDefault: true,
      createdAt: true,
    },
  });
  if (!profile) {
    return null;
  }

  const isFriend = await areUsersFriends(viewerUserId, profile.id);
  const allowed = canViewProfile({
    viewerUserId,
    profileUserId: profile.id,
    privacyDefault: profile.privacyDefault,
    isFriend,
  });

  const [recentRatings, topRankings] = allowed
    ? await Promise.all([
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
      ])
    : [[], []];

  return {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    privacyDefault: profile.privacyDefault,
    createdAt: profile.createdAt.toISOString(),
    friendship: {
      isFriend,
    },
    topRankings: topRankings.map((score, index) => ({
      id: score.id,
      rank: index + 1,
      score: score.score,
      track: {
        id: score.track.id,
        title: score.track.title,
        artistName: score.track.artist.name,
        albumArtUrl: score.track.albumArtUrl,
      },
    })),
    recentRatings: recentRatings.map((entry) => ({
      id: entry.id,
      tier: entry.tier,
      tierLabel: tierLabels[entry.tier],
      createdAt: entry.createdAt.toISOString(),
      track: {
        id: entry.track.id,
        title: entry.track.title,
        artistName: entry.track.artist.name,
        albumArtUrl: entry.track.albumArtUrl,
      },
    })),
  };
}