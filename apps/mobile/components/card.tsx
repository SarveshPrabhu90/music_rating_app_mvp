import { PropsWithChildren } from "react";
import { View } from "react-native";

export function Card({ children }: PropsWithChildren) {
  return <View style={{ borderRadius: 20, backgroundColor: "#ffffff", padding: 16, gap: 10 }}>{children}</View>;
}