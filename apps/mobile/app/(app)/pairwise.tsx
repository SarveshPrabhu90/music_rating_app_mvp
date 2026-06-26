import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Copy, Heading, Title } from "@/components/text";
import { mobileApi } from "@/lib/api";

type Option = {
  trackId: string;
  title: string;
  artistName: string;
  score: number;
  confidence: number;
};

function confidencePair(options: Option[]) {
  if (options.length < 2) return null;
  const sortedByScore = [...options].sort((a, b) => b.score - a.score);
  const lowConfidence = [...sortedByScore].sort((a, b) => a.confidence - b.confidence).slice(0, Math.min(8, sortedByScore.length));
  const target = lowConfidence[Math.floor(Math.random() * lowConfidence.length)] ?? sortedByScore[0];
  const targetIndex = sortedByScore.findIndex((item) => item.trackId === target.trackId);
  const nearby = sortedByScore.filter((_, index) => index !== targetIndex && Math.abs(index - targetIndex) <= 4);
  const challengerPool = nearby.length ? nearby : sortedByScore.filter((item) => item.trackId !== target.trackId);
  const challenger = challengerPool[Math.floor(Math.random() * challengerPool.length)] ?? null;
  return challenger ? ([target, challenger] as const) : null;
}

export default function PairwiseScreen() {
  const [options, setOptions] = useState<Option[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [status, setStatus] = useState("");
  const [pair, setPair] = useState<readonly [Option, Option] | null>(null);

  useEffect(() => {
    mobileApi.getRankings().then((data) => {
      const nextOptions = data.rankings.map((row) => ({
        trackId: row.trackId,
        title: row.track.title,
        artistName: row.track.artist.name,
        score: row.score,
        confidence: row.confidence,
      }));
      setOptions(nextOptions);
      setPair(confidencePair(nextOptions));
    }).catch(() => {
      setOptions([]);
      setPair(null);
    });
  }, []);

  const canRender = useMemo(() => Boolean(pair && pair.length === 2), [pair]);

  async function pickWinner(winnerTrackId: string) {
    if (!pair) return;
    const [left, right] = pair;
    await mobileApi.createPairwise({ leftTrackId: left.trackId, rightTrackId: right.trackId, winnerTrackId });
    setSessionCount((value) => value + 1);
    setStatus("Calibration locked. Your ranking got sharper.");
    setPair(confidencePair(options));
  }

  return (
    <Screen>
      <Heading>Pairwise</Heading>
      {!canRender || !pair ? (
        <Card><Copy>Log more tracks to start calibrating.</Copy></Card>
      ) : (
        <>
          <Card>
            <Copy>Comparisons this session: {sessionCount}</Copy>
            {pair.map((option) => (
              <View key={option.trackId} style={{ marginTop: 12, gap: 6 }}>
                <Title>{option.title}</Title>
                <Copy>{option.artistName} • {Math.round(option.confidence * 100)}% confidence</Copy>
                <Pressable onPress={() => void pickWinner(option.trackId)} style={buttonStyle}>
                  <Title style={{ color: "#fafafa", fontSize: 16 }}>Pick this one</Title>
                </Pressable>
              </View>
            ))}
          </Card>
          <Pressable onPress={() => setPair(confidencePair(options))} style={[buttonStyle, { backgroundColor: "#e4e4e7" }]}>
            <Title style={{ color: "#18181b", fontSize: 16 }}>Skip</Title>
          </Pressable>
          {status ? <Copy>{status}</Copy> : null}
        </>
      )}
    </Screen>
  );
}

const buttonStyle = { borderRadius: 12, backgroundColor: "#18181b", padding: 14, alignItems: "center" } as const;