import { tierLabels } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";
import { getAcceptedFriendIds } from "@/lib/social/friendships";

type FeedDbClient = Pick<typeof prisma, "friendship" | "diaryEntry" | "rankingComparison" | "track">;

export type FeedItem =
  | {
      id: string;
      type: "rating";
      createdAt: string;
      user: { id: string; name: string; username: string; avatarUrl: string | null };
      text: string;
      meta: string;
      track: { id: string; title: string; artistName: string };
    }
  | {
      id: string;
      type: "comparison";
      createdAt: string;
      user: { id: string; name: string; username: string; avatarUrl: string | null };
      text: string;
      meta: string;
      track: { id: string; title: string; artistName: string };
    };

export async function buildFriendActivityFeed(userId: string, limit = 25, db: FeedDbClient = prisma) {
  const friendIds = await getAcceptedFriendIds(userId, db);
  if (!friendIds.length) {
    return [] as FeedItem[];
  }

  const [entries, comparisons] = await Promise.all([
    db.diaryEntry.findMany({
      where: { userId: { in: friendIds } },
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true } },
        track: { include: { artist: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.rankingComparison.findMany({
      where: { userId: { in: friendIds } },
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const comparisonTrackIds = Array.from(
    new Set(comparisons.flatMap((item) => [item.winnerTrackId, item.loserTrackId])),
  );
  const comparisonTracks = comparisonTrackIds.length
    ? await db.track.findMany({
        where: { id: { in: comparisonTrackIds } },
        include: { artist: true },
      })
    : [];
  const trackById = new Map(comparisonTracks.map((track) => [track.id, track]));

  return [
    ...entries.map((entry) => ({
      id: `rating-${entry.id}`,
      type: "rating" as const,
      createdAt: entry.createdAt.toISOString(),
      user: entry.user,
      text: `${entry.user.name} rated ${entry.track.title} by ${entry.track.artist.name} as ${tierLabels[entry.tier]}${
        entry.note ? ` — \"${entry.note}\"` : ""
      }`,
      meta: tierLabels[entry.tier],
      track: { id: entry.track.id, title: entry.track.title, artistName: entry.track.artist.name },
    })),
    ...comparisons.map((comparison) => {
      const winner = trackById.get(comparison.winnerTrackId);
      const loser = trackById.get(comparison.loserTrackId);
      return {
        id: `comparison-${comparison.id}`,
        type: "comparison" as const,
        createdAt: comparison.createdAt.toISOString(),
        user: comparison.user,
        text: `${comparison.user.name} chose ${winner?.title ?? "a track"} over ${loser?.title ?? "another track"}`,
        meta: `Delta ${Math.round(comparison.delta)}`,
        track: {
          id: winner?.id ?? comparison.winnerTrackId,
          title: winner?.title ?? "Unknown track",
          artistName: winner?.artist.name ?? "Unknown artist",
        },
      };
    }),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}