"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Option = {
  trackId: string;
  title: string;
  artistName: string;
};

function randomPair(options: Option[]) {
  if (options.length < 2) return null;

  const leftIndex = Math.floor(Math.random() * options.length);
  let rightIndex = Math.floor(Math.random() * options.length);
  while (rightIndex === leftIndex) rightIndex = Math.floor(Math.random() * options.length);

  return [options[leftIndex], options[rightIndex]] as const;
}

export function PairwiseCalibrator({ options }: { options: Option[] }) {
  const [pair, setPair] = useState(() => randomPair(options));
  const [status, setStatus] = useState("");

  const canRender = useMemo(() => Boolean(pair && pair.length === 2), [pair]);

  if (!canRender || !pair) {
    return <p className="text-sm text-zinc-600">Log more tracks to start calibrating.</p>;
  }

  const [left, right] = pair;

  async function submitWinner(winnerTrackId: string) {
    const response = await fetch("/api/pairwise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leftTrackId: left.trackId,
        rightTrackId: right.trackId,
        winnerTrackId,
      }),
    });

    if (!response.ok) {
      setStatus("Could not record comparison.");
      return;
    }

    setStatus("Taste calibration saved.");
    setPair(randomPair(options));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">Quick taste calibration: which one matters more to you?</p>
      <div className="grid gap-3 md:grid-cols-2">
        {[left, right].map((option) => (
          <Card key={option.trackId} className="space-y-2">
            <p className="text-xs text-zinc-500">{option.artistName}</p>
            <h3 className="text-lg font-semibold">{option.title}</h3>
            <Button className="w-full" onClick={() => void submitWinner(option.trackId)}>
              Pick this one
            </Button>
          </Card>
        ))}
      </div>
      <Button variant="ghost" onClick={() => setPair(randomPair(options))}>
        Skip
      </Button>
      {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
    </div>
  );
}
