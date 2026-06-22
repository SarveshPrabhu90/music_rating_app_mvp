import { Tier, type DiaryEntry, type EntryTag, type Track, type UserTrackScore } from "@prisma/client";

const tierWeight: Record<Tier, number> = {
  LIFE_SONG: 5,
  ELITE: 4,
  HEAVY_ROTATION: 3,
  LIKED: 2,
  NOT_FOR_ME: 1,
};

function topFromMap(map: Map<string, number>, fallback: string) {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

export function summarizeTaste({
  scores,
  entries,
  tracks,
  entryTags,
}: {
  scores: UserTrackScore[];
  entries: DiaryEntry[];
  tracks: Track[];
  entryTags: (EntryTag & { tag: { name: string } })[];
}) {
  const trackById = new Map(tracks.map((track) => [track.id, track]));
  const genreMap = new Map<string, number>();
  const eraMap = new Map<string, number>();
  const moodMap = new Map<string, number>();

  for (const score of scores) {
    const track = trackById.get(score.trackId);
    if (!track) continue;

    genreMap.set(track.genre, (genreMap.get(track.genre) ?? 0) + tierWeight[score.tier]);
    eraMap.set(track.era, (eraMap.get(track.era) ?? 0) + tierWeight[score.tier]);
  }

  for (const entryTag of entryTags) {
    moodMap.set(entryTag.tag.name, (moodMap.get(entryTag.tag.name) ?? 0) + 1);
  }

  const topGenre = topFromMap(genreMap, "Eclectic");
  const topEra = topFromMap(eraMap, "Modern");
  const topMood = topFromMap(moodMap, "Discovery");

  const topTrackIds = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((score) => score.trackId);

  const topTracks = topTrackIds
    .map((id) => trackById.get(id))
    .filter((track): track is Track => Boolean(track));

  const recentEntries = [...entries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 6);
  const recentGenres = recentEntries
    .map((entry) => trackById.get(entry.trackId)?.genre)
    .filter((genre): genre is string => Boolean(genre));

  const recentPhase = recentGenres[0] ? `${recentGenres[0]} leaning` : "Open mode";

  return {
    topGenre,
    topEra,
    topMood,
    topTracks,
    currentSound: `${topMood} ${topGenre}`,
    anchors: topTracks,
    recentPhase,
  };
}
