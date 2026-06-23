import type { RankingComparison, Tier, Track, UserTrackScore } from "@prisma/client";

import { calculateConfidence, rankingWeight } from "@/lib/ranking/scoring";

type RankedTrack = UserTrackScore & {
  track: Track & { artist: { name: string }; album: { title: string } };
};

type ComparisonRow = Pick<RankingComparison, "winnerTrackId" | "loserTrackId" | "delta" | "createdAt">;

export type TrackRankingRow = {
  trackId: string;
  title: string;
  artistName: string;
  albumTitle: string;
  tier: Tier;
  score: number;
  confidence: number;
  comparisonCount: number;
  weightedScore: number;
};

export type AlbumRankingRow = {
  albumId: string;
  title: string;
  artistName: string;
  score: number;
  confidence: number;
  trackCount: number;
};

export type ArtistRankingRow = {
  artistId: string;
  name: string;
  score: number;
  confidence: number;
  trackCount: number;
};

export type RankingLists = {
  topSongs: TrackRankingRow[];
  topAlbums: AlbumRankingRow[];
  topArtists: ArtistRankingRow[];
  recentlyRising: TrackRankingRow[];
  allTimeAnchors: TrackRankingRow[];
  thisMonthsSound: string[];
};

export function buildComparisonCountMap(comparisons: ComparisonRow[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const comparison of comparisons) {
    counts.set(comparison.winnerTrackId, (counts.get(comparison.winnerTrackId) ?? 0) + 1);
    counts.set(comparison.loserTrackId, (counts.get(comparison.loserTrackId) ?? 0) + 1);
  }

  return counts;
}

export function buildRankingLists({
  rankedTracks,
  comparisons,
  monthEntries,
}: {
  rankedTracks: RankedTrack[];
  comparisons: ComparisonRow[];
  monthEntries: Array<{ trackId: string; createdAt: Date; track: { genre: string } }>;
}): RankingLists {
  const comparisonCountMap = buildComparisonCountMap(comparisons);

  const songRows: TrackRankingRow[] = rankedTracks.map((item) => {
    const comparisonCount = comparisonCountMap.get(item.trackId) ?? 0;
    const confidence = calculateConfidence(comparisonCount);

    return {
      trackId: item.trackId,
      title: item.track.title,
      artistName: item.track.artist.name,
      albumTitle: item.track.album.title,
      tier: item.tier,
      score: item.score,
      confidence,
      comparisonCount,
      weightedScore: rankingWeight(item.score, confidence),
    };
  });

  const topSongs = [...songRows].sort((a, b) => b.weightedScore - a.weightedScore).slice(0, 20);

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const risingMap = new Map<string, number>();
  for (const comparison of comparisons) {
    if (comparison.createdAt < monthAgo) continue;

    risingMap.set(comparison.winnerTrackId, (risingMap.get(comparison.winnerTrackId) ?? 0) + comparison.delta);
    risingMap.set(comparison.loserTrackId, (risingMap.get(comparison.loserTrackId) ?? 0) - comparison.delta * 0.65);
  }

  const recentlyRising = [...songRows]
    .map((row) => ({
      ...row,
      weightedScore: (risingMap.get(row.trackId) ?? 0) + row.confidence * 6,
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 8);

  const albumMap = new Map<string, AlbumRankingRow>();
  for (const row of songRows) {
    const key = rankedTracks.find((item) => item.trackId === row.trackId)?.track.albumId;
    if (!key) continue;

    const current = albumMap.get(key);
    if (!current) {
      albumMap.set(key, {
        albumId: key,
        title: row.albumTitle,
        artistName: row.artistName,
        score: row.weightedScore,
        confidence: row.confidence,
        trackCount: 1,
      });
      continue;
    }

    current.score += row.weightedScore;
    current.confidence += row.confidence;
    current.trackCount += 1;
  }

  const topAlbums = [...albumMap.values()]
    .map((album) => ({
      ...album,
      score: album.score / album.trackCount,
      confidence: album.confidence / album.trackCount,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const artistMap = new Map<string, ArtistRankingRow>();
  for (const row of songRows) {
    const key = rankedTracks.find((item) => item.trackId === row.trackId)?.track.artistId;
    if (!key) continue;

    const current = artistMap.get(key);
    if (!current) {
      artistMap.set(key, {
        artistId: key,
        name: row.artistName,
        score: row.weightedScore,
        confidence: row.confidence,
        trackCount: 1,
      });
      continue;
    }

    current.score += row.weightedScore;
    current.confidence += row.confidence;
    current.trackCount += 1;
  }

  const topArtists = [...artistMap.values()]
    .map((artist) => ({
      ...artist,
      score: artist.score / artist.trackCount,
      confidence: artist.confidence / artist.trackCount,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const anchorCounts = new Map<string, number>();
  for (const entry of monthEntries) {
    anchorCounts.set(entry.trackId, (anchorCounts.get(entry.trackId) ?? 0) + 1);
  }

  const allTimeAnchors = [...songRows]
    .map((row) => ({
      ...row,
      weightedScore: row.weightedScore + (anchorCounts.get(row.trackId) ?? 0) * 8,
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 8);

  const monthGenreMap = new Map<string, number>();
  for (const entry of monthEntries) {
    monthGenreMap.set(entry.track.genre, (monthGenreMap.get(entry.track.genre) ?? 0) + 1);
  }

  const thisMonthsSound = [...monthGenreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);

  return {
    topSongs,
    topAlbums,
    topArtists,
    recentlyRising,
    allTimeAnchors,
    thisMonthsSound,
  };
}
