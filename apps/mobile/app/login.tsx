import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Copy, Heading, Title } from "@/components/text";
import { useSession } from "@/lib/session";

export default function LoginScreen() {
  const session = useSession();
  const [email, setEmail] = useState("demo@musicdiary.app");
  const [password, setPassword] = useState("password123");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
      <Card>
        <Heading>Basso</Heading>
        <Copy>Sign in with the same backend credentials your web app uses.</Copy>
        <View style={{ gap: 10 }}>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" style={{ borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 12, padding: 12 }} placeholder="Email" />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 12, padding: 12 }} placeholder="Password" />
        </View>
        <Pressable
          onPress={async () => {
            setLoading(true);
            setMessage("");
            try {
              await session.signIn(email, password);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Could not sign in.");
            } finally {
              setLoading(false);
            }
          }}
          style={{ backgroundColor: "#18181b", borderRadius: 12, padding: 14 }}
        >
          <Title style={{ color: "#fafafa", textAlign: "center", fontSize: 16 }}>{loading ? "Signing in..." : "Sign in"}</Title>
        </Pressable>
        {message ? <Copy>{message}</Copy> : null}
      </Card>
    </Screen>
  );
}