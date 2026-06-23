"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";

type Recommendation = {
  id: string;
  reason: string;
  status: "ACTIVE" | "SAVED" | "DISMISSED";
  track: {
    id: string;
    title: string;
    genre: string;
    artist: { name: string };
  };
};

export function RecommendationsList() {
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const data = await apiClient.recommendationsGet();
      setRows(data.recommendations as Recommendation[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-zinc-600">Loading recommendations...</p>;
  if (!rows.length) return <p className="text-sm text-zinc-600">Log a few tracks to unlock recommendations.</p>;

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <Card key={row.id} className="space-y-2">
          <p className="text-xs text-zinc-500">{row.track.artist.name}</p>
          <h3 className="text-lg font-semibold">{row.track.title}</h3>
          <p className="text-sm text-zinc-600">{row.reason}</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await apiClient.recommendationsPatch({ trackId: row.track.id, action: "save" });
                await apiClient.diaryCreate({
                  trackId: row.track.id,
                  tier: "LIKED",
                  note: "Saved from recommendations",
                  tags: ["discovery"],
                });
                setRows((current) => current.filter((item) => item.id !== row.id));
              }}
            >
              Save to diary
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await apiClient.recommendationsPatch({ trackId: row.track.id, action: "dismiss" });
                setRows((current) => current.filter((item) => item.id !== row.id));
              }}
            >
              Dismiss
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
