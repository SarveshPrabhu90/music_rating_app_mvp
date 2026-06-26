import { Redirect, Tabs } from "expo-router";

import { useSession } from "@/lib/session";

export default function AppLayout() {
  const session = useSession();

  if (!session.ready) {
    return null;
  }

  if (!session.authenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="diary" options={{ title: "Diary" }} />
      <Tabs.Screen name="rankings" options={{ title: "Rankings" }} />
      <Tabs.Screen name="pairwise" options={{ title: "Pairwise" }} />
      <Tabs.Screen name="recommendations" options={{ title: "Recs" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="friends" options={{ title: "Friends" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}