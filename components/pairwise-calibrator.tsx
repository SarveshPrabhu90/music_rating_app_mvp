"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";

type Option = {
  trackId: string;
  title: string;
  artistName: string;
  score: number;
  confidence: number;
  comparisonCount: number;
};

function confidencePair(options: Option[]) {
  if (options.length < 2) return null;

  const sortedByScore = [...options].sort((a, b) => b.score - a.score);
  const lowConfidence = [...sortedByScore]
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, Math.min(8, sortedByScore.length));

  const target = lowConfidence[Math.floor(Math.random() * lowConfidence.length)] ?? sortedByScore[0];
  const targetIndex = sortedByScore.findIndex((item) => item.trackId === target.trackId);

  const nearby = sortedByScore.filter(
    (_, index) => index !== targetIndex && Math.abs(index - targetIndex) <= 4,
  );
  const challengerPool = nearby.length
    ? nearby
    : sortedByScore.filter((item) => item.trackId !== target.trackId);
  const challenger = challengerPool[Math.floor(Math.random() * challengerPool.length)] ?? null;

  if (!challenger) return null;

  return [target, challenger] as const;
}

export function PairwiseCalibrator({ options }: { options: Option[] }) {
  const [pair, setPair] = useState(() => confidencePair(options));
  const [status, setStatus] = useState("");
  const [sessionCount, setSessionCount] = useState(0);

  const canRender = useMemo(() => Boolean(pair && pair.length === 2), [pair]);

  if (!canRender || !pair) {
    return <p className="text-sm text-zinc-600">Log more tracks to start calibrating.</p>;
  }

  const [left, right] = pair;

  async function submitWinner(winnerTrackId: string) {
    try {
      await apiClient.pairwiseCreate({
        leftTrackId: left.trackId,
        rightTrackId: right.trackId,
        winnerTrackId,
      });
    } catch {
      setStatus("Could not record comparison.");
      return;
    }

    setSessionCount((value) => value + 1);
    setStatus("Calibration locked. Your ranking just got sharper.");
    setPair(confidencePair(options));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-zinc-600">Taste calibration sprint: settle close calls in seconds.</p>
        <p className="text-xs text-zinc-500">Comparisons this session: {sessionCount}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[left, right].map((option) => (
          <Card key={option.trackId} className="space-y-2">
            <p className="text-xs text-zinc-500">{option.artistName}</p>
            <h3 className="text-lg font-semibold">{option.title}</h3>
            <p className="text-xs text-zinc-500">
              Confidence {Math.round(option.confidence * 100)}% • {option.comparisonCount} comps
            </p>
            <Button className="w-full" onClick={() => void submitWinner(option.trackId)}>
              Pick this one
            </Button>
          </Card>
        ))}
      </div>
      <Button variant="ghost" onClick={() => setPair(confidencePair(options))}>
        Skip
      </Button>
      {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
    </div>
  );
}
