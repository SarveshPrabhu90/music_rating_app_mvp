"use client";

import { Tier, type Track } from "@prisma/client";
import { useMemo, useState } from "react";

import { tierLabels } from "@/lib/constants";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";

type Item = {
  rank: number;
  trackId: string;
  score: number;
  tier: Tier;
  confidence: number;
  comparisonCount: number;
  rankDelta: number | null;
  lastInteractedAt: string;
  track: Track & { artist: { name: string } };
};

export function LibraryTable({ items }: { items: Item[] }) {
  const [rows, setRows] = useState(items);
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"score" | "recent">("score");

  const visibleRows = useMemo(() => {
    const filtered = filterTier === "ALL" ? rows : rows.filter((row) => row.tier === filterTier);
    return [...filtered].sort((a, b) =>
      sortBy === "score"
        ? b.score - a.score
        : new Date(b.lastInteractedAt).getTime() - new Date(a.lastInteractedAt).getTime(),
    );
  }, [filterTier, rows, sortBy]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3">
        <Select value={filterTier} onChange={(event) => setFilterTier(event.target.value)}>
          <option value="ALL">All tiers</option>
          {Object.values(Tier).map((tier) => (
            <option key={tier} value={tier}>
              {tierLabels[tier]}
            </option>
          ))}
        </Select>
        <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as "score" | "recent")}>
          <option value="score">Sort: score</option>
          <option value="recent">Sort: recently added</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Track</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Trend</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.trackId} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">#{row.rank}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.track.title}</p>
                  <p className="text-xs text-zinc-500">{row.track.artist.name}</p>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={row.tier}
                    onChange={async (event) => {
                      const nextTier = event.target.value as Tier;
                      const data = await apiClient.rankingsPatch({ trackId: row.trackId, tier: nextTier });

                      setRows((current) =>
                        current.map((item) =>
                          item.trackId === row.trackId
                            ? {
                                ...item,
                                tier: nextTier,
                                score: typeof data.score === "number" ? data.score : item.score,
                              }
                            : item,
                        ),
                      );
                    }}
                  >
                    {Object.values(Tier).map((tier) => (
                      <option key={tier} value={tier}>
                        {tierLabels[tier]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3 font-medium">{Math.round(row.score)}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {row.rankDelta === null
                    ? "—"
                    : row.rankDelta > 0
                      ? `↑ ${row.rankDelta}`
                      : row.rankDelta < 0
                        ? `↓ ${Math.abs(row.rankDelta)}`
                        : "→"}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {Math.round(row.confidence * 100)}% • {row.comparisonCount} comps
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await apiClient.rankingsDelete(row.trackId);
                      setRows((current) => current.filter((item) => item.trackId !== row.trackId));
                    }}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
