import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Copy, Heading, Title } from "@/components/text";
import { mobileApi } from "@/lib/api";

type RecommendationsData = Awaited<ReturnType<typeof mobileApi.getRecommendations>>;

export default function RecommendationsScreen() {
  const [data, setData] = useState<RecommendationsData | null>(null);

  useEffect(() => {
    mobileApi.getRecommendations().then(setData).catch(() => setData(null));
  }, []);

  async function applyAction(trackId: string, action: "save" | "dismiss") {
    await mobileApi.patchRecommendation({ trackId, action });
    if (action === "save") {
      await mobileApi.createDiaryEntry({
        trackId,
        tier: "LIKED",
        note: "Saved from recommendations",
        tags: ["discovery"],
      });
    }
    setData((current) => current ? {
      ...current,
      recommendations: current.recommendations.filter((item) => item.track.id !== trackId),
    } : current);
  }

  return (
    <Screen>
      <Heading>Recommendations</Heading>
      {data?.recommendations.length ? data.recommendations.map((item) => (
        <Card key={item.id}>
          <Title>{item.track.title}</Title>
          <Copy>{item.track.artist.name}</Copy>
          <Copy>{item.reason}</Copy>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable onPress={() => void applyAction(item.track.id, "save")} style={buttonStyle}>
              <Title style={{ color: "#fafafa", fontSize: 16 }}>Save</Title>
            </Pressable>
            <Pressable onPress={() => void applyAction(item.track.id, "dismiss")} style={[buttonStyle, { backgroundColor: "#e4e4e7" }]}>
              <Title style={{ color: "#18181b", fontSize: 16 }}>Dismiss</Title>
            </Pressable>
          </View>
        </Card>
      )) : <Card><Copy>No recommendations yet.</Copy></Card>}
    </Screen>
  );
}

const buttonStyle = { flex: 1, borderRadius: 12, backgroundColor: "#18181b", padding: 12, alignItems: "center" } as const;