import { SafeAreaView, ScrollView, ViewStyle } from "react-native";

export function Screen({ children, contentStyle }: { children: React.ReactNode; contentStyle?: ViewStyle }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f4ef" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, ...(contentStyle ?? {}) }}>{children}</ScrollView>
    </SafeAreaView>
  );
}