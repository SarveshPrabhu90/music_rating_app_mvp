import { useEffect, useState } from "react";
import { View } from "react-native";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Copy, Heading, Title } from "@/components/text";
import { mobileApi } from "@/lib/api";
import { useSession } from "@/lib/session";

type DashboardData = Awaited<ReturnType<typeof mobileApi.getDashboard>>;

export default function DashboardScreen() {
  const session = useSession();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    mobileApi.getDashboard().then(setData).catch(() => setData(null));
  }, []);

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Copy>Welcome back</Copy>
        <Heading>{session.user?.name ?? "Listener"}</Heading>
      </View>

      <Card>
        <Title>Counts</Title>
        <Copy>Ratings: {data?.counts.ratings ?? 0}</Copy>
        <Copy>Rankings: {data?.counts.rankings ?? 0}</Copy>
        <Copy>Friends: {data?.counts.friends ?? 0}</Copy>
      </Card>

      <Card>
        <Title>Recent ratings</Title>
        {data?.summary.recentEntries.length ? data.summary.recentEntries.map((entry) => (
          <Copy key={entry.id}>{entry.track.title} • {entry.track.artistName} • {entry.tierLabel}</Copy>
        )) : <Copy>No ratings yet.</Copy>}
      </Card>

      <Card>
        <Title>Top rankings</Title>
        {data?.summary.topRankings.length ? data.summary.topRankings.map((item) => (
          <Copy key={item.id}>{item.track.title} • {Math.round(item.score)} pts</Copy>
        )) : <Copy>No rankings yet.</Copy>}
      </Card>

      <Card>
        <Title>Feed preview</Title>
        {data?.feedPreview.length ? data.feedPreview.map((item) => (
          <Copy key={item.id}>{item.text}</Copy>
        )) : <Copy>No friend activity yet.</Copy>}
      </Card>
    </Screen>
  );
}