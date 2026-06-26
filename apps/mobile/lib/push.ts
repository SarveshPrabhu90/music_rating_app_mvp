import { Platform } from "react-native";

export async function registerForPushNotifications(
  register: (payload: { token: string; platform: "ios" | "android" }) => Promise<unknown>,
) {
  const token = process.env.EXPO_PUBLIC_DEV_PUSH_TOKEN?.trim();
  if (!token) {
    return { registered: false, reason: "No push token configured in development." } as const;
  }

  const platform = Platform.OS === "ios" ? "ios" : "android";
  await register({ token, platform });
  return { registered: true } as const;
}