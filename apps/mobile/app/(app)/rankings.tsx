import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Copy, Heading, Title } from "@/components/text";
import { tierOptions } from "@/lib/constants";
import { mobileApi } from "@/lib/api";

type RankingsData = Awaited<ReturnType<typeof mobileApi.getRankings>>;

export default function RankingsScreen() {
  const [data, setData] = useState<RankingsData | null>(null);

  useEffect(() => {
    mobileApi.getRankings().then(setData).catch(() => setData(null));
  }, []);

  return (
    <Screen>
      <Heading>Rankings</Heading>
      {(data?.rankings ?? []).map((item) => (
        <Card key={item.trackId}>
          <Title>{item.rank}. {item.track.title}</Title>
          <Copy>{item.track.artist.name} • {Math.round(item.score)} pts • {Math.round(item.confidence * 100)}% confidence</Copy>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {tierOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={async () => {
                  const patched = await mobileApi.patchRanking(item.trackId, option.value);
                  setData((current) => current ? {
                    ...current,
                    rankings: current.rankings.map((row) => row.trackId === item.trackId ? { ...row, tier: option.value, score: patched.score } : row),
                  } : current);
                }}
                style={[chipStyle, item.tier === option.value && activeChipStyle]}
              >
                <Copy style={{ color: item.tier === option.value ? "#fafafa" : undefined }}>{option.label}</Copy>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={async () => {
              await mobileApi.deleteRanking(item.trackId);
              setData((current) => current ? { ...current, rankings: current.rankings.filter((row) => row.trackId !== item.trackId) } : current);
            }}
            style={[buttonStyle, { marginTop: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7" }]}
          >
            <Title style={{ color: "#18181b", fontSize: 16 }}>Remove</Title>
          </Pressable>
        </Card>
      ))}
      {!data?.rankings.length ? <Card><Copy>No rankings yet.</Copy></Card> : null}
    </Screen>
  );
}

const chipStyle = { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#e4e4e7" } as const;
const activeChipStyle = { backgroundColor: "#18181b" } as const;
const buttonStyle = { borderRadius: 12, padding: 12, alignItems: "center" } as const;