import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for Expo push and upserts the token into
 * `device_push_tokens` so the checker (GitHub Actions) can notify it on
 * up<->down transitions. v1 is single-user, so userId can be a fixed local
 * identifier until real auth exists.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("[notifications] push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.warn("[notifications] permission not granted");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();

  const { error } = await supabase
    .from("device_push_tokens")
    .upsert({ user_id: userId, expo_push_token: token }, { onConflict: "user_id,expo_push_token" });
  if (error) console.warn("[notifications] failed to save push token:", error.message);

  return token;
}
