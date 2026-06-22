"use client";

import { Tier } from "@prisma/client";
import { useMemo, useState } from "react";

import { moodTags, tierLabels } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TrackOption = {
  id: string;
  title: string;
  artist: { name: string };
  album: { title: string };
  genre: string;
};

export function DiaryEntryForm({ defaultTracks }: { defaultTracks: TrackOption[] }) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState(defaultTracks);
  const [selectedTrackId, setSelectedTrackId] = useState(defaultTracks[0]?.id ?? "");
  const [tier, setTier] = useState<Tier>(Tier.HEAVY_ROTATION);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
          const response = await fetch("/api/diary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trackId: selectedTrackId,
              tier,
              note,
              tags: selectedTags,
            }),
          });

          if (!response.ok) {
            setMessage("Could not save entry.");
            setLoading(false);
            return;
          }

          setMessage("Saved to today’s diary.");
          setLoading(false);
        }}
      >
        {loading ? "Saving..." : "Save entry"}
      </Button>

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
