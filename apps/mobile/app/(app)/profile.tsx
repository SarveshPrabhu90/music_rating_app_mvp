import { useEffect, useState } from "react";
import { Pressable } from "react-native";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Copy, Heading, Title } from "@/components/text";
import { mobileApi } from "@/lib/api";
import { useSession } from "@/lib/session";

type Bootstrap = Awaited<ReturnType<typeof mobileApi.getBootstrap>>;

export default function ProfileScreen() {
  const session = useSession();
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);

  useEffect(() => {
    mobileApi.getBootstrap().then(setBootstrap).catch(() => setBootstrap(null));
  }, []);

  return (
    <Screen>
      <Heading>Profile</Heading>
      <Card>
        <Title>{bootstrap?.user.name ?? session.user?.name ?? "Listener"}</Title>
        <Copy>@{bootstrap?.user.username ?? session.user?.username}</Copy>
        <Copy>{bootstrap?.user.bio ?? "No bio yet."}</Copy>
        <Copy>Plan: {bootstrap?.user.subscriptionPlan ?? session.user?.subscriptionPlan}</Copy>
      </Card>
      <Card>
        <Title>Account stats</Title>
        <Copy>Ratings: {bootstrap?.counts.ratings ?? 0}</Copy>
        <Copy>Rankings: {bootstrap?.counts.rankings ?? 0}</Copy>
        <Copy>Friends: {bootstrap?.counts.friends ?? 0}</Copy>
      </Card>
      <Pressable onPress={() => session.signOut()} style={{ backgroundColor: "#18181b", borderRadius: 12, padding: 14 }}>
        <Title style={{ color: "#fafafa", textAlign: "center", fontSize: 16 }}>Sign out</Title>
      </Pressable>
    </Screen>
  );
}