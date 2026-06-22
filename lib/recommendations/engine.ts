import { Tier, type Track } from "@prisma/client";

export type RankedInput = {
  track: Track;
  score: number;
  tier: Tier;
};

export type RecommendationOutput = {
  track: Track;
  score: number;
  reason: string;
};

const tierBoost: Record<Tier, number> = {
  LIFE_SONG: 160,
  ELITE: 120,
  HEAVY_ROTATION: 70,
  LIKED: 35,
  NOT_FOR_ME: -120,
};

export function buildRecommendations({
  catalog,
  rankedTracks,
  frequentTags,
  loggedTrackIds,
}: {
  catalog: Track[];
  rankedTracks: RankedInput[];
  frequentTags: string[];
  loggedTrackIds: Set<string>;
}): RecommendationOutput[] {
  if (!rankedTracks.length) {
    return [];
  }

  const topTracks = [...rankedTracks].sort((a, b) => b.score - a.score).slice(0, 8);
  const topGenres = new Set(topTracks.map((item) => item.track.genre));
  const topEras = new Set(topTracks.map((item) => item.track.era));
  const topArtistIds = new Set(topTracks.map((item) => item.track.artistId));

  const anchor = topTracks[0];

  return catalog
    .filter((track) => !loggedTrackIds.has(track.id))
    .map((track) => {
      let score = 0;

      if (topGenres.has(track.genre)) score += 180;
      if (topEras.has(track.era)) score += 85;
      if (topArtistIds.has(track.artistId)) score += 95;

      for (const ranked of topTracks) {
        if (ranked.track.albumId === track.albumId) score += 45;
        score += tierBoost[ranked.tier] * (ranked.track.genre === track.genre ? 0.12 : 0.02);
      }

      if (frequentTags.some((tag) => ["late night", "nostalgia", "focus"].includes(tag))) {
        score += 20;
      }

      score += Math.max(0, 30 - Math.abs(track.year - anchor.track.year));

      const reason = `Because you ranked ${anchor.track.title} as ${anchor.tier
        .replaceAll("_", " ")
        .toLowerCase()} and often tag songs as ${frequentTags.slice(0, 2).join(" + ") || "discovery"}.`;

      return { track, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
