"use client";

import { Tier } from "@prisma/client";
import { useMemo, useState } from "react";

import { moodTags, tierLabels } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiClient } from "@/lib/api/client";

type TrackOption = {
  id: string;
  title: string;
  artist: { name: string };
  album: { title: string };
  genre: string;
};

type RankedOption = {
  trackId: string;
  title: string;
  artistName: string;
  score: number;
};

type PlacementState = {
  newTrack: RankedOption;
  pool: RankedOption[];
  low: number;
  high: number;
  step: number;
  minComparisons: number;
  maxComparisons: number;
};

function midpoint(low: number, high: number) {
  return Math.floor((low + high) / 2);
}

export function DiaryEntryForm({
  defaultTracks,
  rankedOptions,
}: {
  defaultTracks: TrackOption[];
  rankedOptions: RankedOption[];
}) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState(defaultTracks);
  const [rankedPool, setRankedPool] = useState<RankedOption[]>(
    [...rankedOptions].sort((a, b) => b.score - a.score),
  );
  const [selectedTrackId, setSelectedTrackId] = useState(defaultTracks[0]?.id ?? "");
  const [tier, setTier] = useState<Tier>(Tier.HEAVY_ROTATION);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [placement, setPlacement] = useState<PlacementState | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId),
    [tracks, selectedTrackId],
  );

  async function searchTracks(nextQuery: string) {
    setQuery(nextQuery);
    const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(nextQuery)}`);
    const data = (await response.json()) as { tracks: TrackOption[] };
    setTracks(data.tracks);
    if (data.tracks[0]) setSelectedTrackId(data.tracks[0].id);
  }

  const placementCandidate = useMemo(() => {
    if (!placement) return null;
    if (!placement.pool.length || placement.low > placement.high) return null;

    const index = midpoint(placement.low, placement.high);
    return placement.pool[index] ?? null;
  }, [placement]);

  async function answerPlacement(prefersNewTrack: boolean) {
    if (!placement || !placementCandidate) return;

    const index = midpoint(placement.low, placement.high);
    const winnerTrackId = prefersNewTrack ? placement.newTrack.trackId : placementCandidate.trackId;

    try {
      await apiClient.pairwiseCreate({
        leftTrackId: placement.newTrack.trackId,
        rightTrackId: placementCandidate.trackId,
        winnerTrackId,
      });
    } catch {
      setMessage("Could not save ranking preference.");
      return;
    }

    const nextStep = placement.step + 1;
    const nextLow = prefersNewTrack ? placement.low : index + 1;
    const nextHigh = prefersNewTrack ? index - 1 : placement.high;
    const shouldStop =
      nextStep >= placement.maxComparisons ||
      (nextStep >= placement.minComparisons && nextHigh - nextLow <= 1);

    if (!shouldStop) {
      setPlacement({
        ...placement,
        step: nextStep,
        low: Math.max(0, nextLow),
        high: Math.max(-1, nextHigh),
      });
      return;
    }

    const insertionIndex = Math.max(0, Math.min(placement.pool.length, nextLow));
    const above = placement.pool[insertionIndex - 1];
    const below = placement.pool[insertionIndex];

    let estimatedScore = placement.newTrack.score;
    if (above && below) estimatedScore = (above.score + below.score) / 2;
    else if (above) estimatedScore = above.score - 14;
    else if (below) estimatedScore = below.score + 14;

    const merged = [
      ...placement.pool.slice(0, insertionIndex),
      {
        ...placement.newTrack,
        score: estimatedScore,
      },
      ...placement.pool.slice(insertionIndex),
    ];

    setRankedPool(merged.sort((a, b) => b.score - a.score));
    setPlacement(null);
    setMessage(`Rank placement tuned in ${nextStep} quick comparisons.`);
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search songs, artists, genres"
        value={query}
        onChange={(event) => {
          void searchTracks(event.target.value);
        }}
      />

      <Select value={selectedTrackId} onChange={(event) => setSelectedTrackId(event.target.value)}>
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.title} — {track.artist.name}
          </option>
        ))}
      </Select>

      {selectedTrack ? (
        <p className="text-sm text-zinc-600">
          {selectedTrack.album.title} • {selectedTrack.genre}
        </p>
      ) : null}

      <Select value={tier} onChange={(event) => setTier(event.target.value as Tier)}>
        {Object.values(Tier).map((value) => (
          <option key={value} value={value}>
            {tierLabels[value]}
          </option>
        ))}
      </Select>

      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Why did this song hit?"
        rows={3}
      />

      <div className="flex flex-wrap gap-2">
        {moodTags.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() =>
                setSelectedTags((current) =>
                  current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
                )
              }
              className={`rounded-full px-3 py-1 text-xs ${
                active ? "bg-violet-700 text-white" : "bg-zinc-200 text-zinc-700"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        disabled={loading || !selectedTrackId}
        onClick={async () => {
          setLoading(true);
          setMessage("");
          try {
            const payload = await apiClient.diaryCreate({
              trackId: selectedTrackId,
              tier,
              note,
              tags: selectedTags,
            });

            const selected = tracks.find((track) => track.id === selectedTrackId);
            if (selected) {
              const newRanked: RankedOption = {
                trackId: selected.id,
                title: selected.title,
                artistName: selected.artist.name,
                score: payload.score,
              };

              const withoutCurrent = rankedPool.filter((item) => item.trackId !== selected.id);

              if (payload.shouldPromptPlacement && withoutCurrent.length) {
                setPlacement({
                  newTrack: newRanked,
                  pool: withoutCurrent,
                  low: 0,
                  high: withoutCurrent.length - 1,
                  step: 0,
                  minComparisons: Math.min(2, withoutCurrent.length),
                  maxComparisons: Math.min(4, withoutCurrent.length),
                });
                setMessage("Saved to diary. Place it in your ranking with a few quick picks.");
              } else {
                setRankedPool([...withoutCurrent, newRanked].sort((a, b) => b.score - a.score));
                setMessage("Saved to today’s diary.");
              }
            } else {
              setMessage("Saved to today’s diary.");
            }

            setLoading(false);
          } catch (error) {
            const message =
              error instanceof ApiClientError ? error.message : "Could not save entry.";
            setMessage(message);
            setLoading(false);
          }
        }}
      >
        {loading ? "Saving..." : "Save entry"}
      </Button>

      {placement && placementCandidate ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Placement comparison {placement.step + 1} of {placement.maxComparisons}
          </p>
          <p className="mt-2 text-sm text-zinc-700">
            Do you like <span className="font-semibold">{placement.newTrack.title}</span> more than
            <span className="font-semibold"> {placementCandidate.title}</span> by {placementCandidate.artistName}?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void answerPlacement(true)}>
              Yes, new one more
            </Button>
            <Button type="button" variant="secondary" onClick={() => void answerPlacement(false)}>
              No, keep existing higher
            </Button>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
