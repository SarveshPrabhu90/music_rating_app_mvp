import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotifications(
  register: (payload: { token: string; platform: "ios" | "android" }) => Promise<unknown>,
) {
  if (!Device.isDevice) {
    const fallbackToken = process.env.EXPO_PUBLIC_DEV_PUSH_TOKEN?.trim();
    if (!fallbackToken) {
      return { registered: false, reason: "Push notifications require a physical device or a development fallback token." } as const;
    }

    const platform = Platform.OS === "ios" ? "ios" : "android";
    await register({ token: fallbackToken, platform });
    return { registered: true } as const;
  }

  const permissionState = await Notifications.getPermissionsAsync();
  let finalStatus = permissionState.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return { registered: false, reason: "Push notification permission was not granted." } as const;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_EXPO_PROJECT_ID ?? undefined;
  const pushToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const platform = Platform.OS === "ios" ? "ios" : "android";
  await register({ token: pushToken.data, platform });
  return { registered: true } as const;
}