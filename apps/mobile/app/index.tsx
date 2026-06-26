import { Redirect } from "expo-router";

import { useSession } from "@/lib/session";

export default function Index() {
  const session = useSession();

  if (!session.ready) {
    return null;
  }

  return <Redirect href={session.authenticated ? "/(app)/dashboard" : "/login"} />;
}