import { Text as RNText, type TextProps } from "react-native";

export function Heading(props: TextProps) {
  return <RNText {...props} style={[{ fontSize: 28, fontWeight: "700", color: "#18181b" }, props.style]} />;
}

export function Title(props: TextProps) {
  return <RNText {...props} style={[{ fontSize: 18, fontWeight: "600", color: "#18181b" }, props.style]} />;
}

export function Copy(props: TextProps) {
  return <RNText {...props} style={[{ fontSize: 14, color: "#52525b" }, props.style]} />;
}