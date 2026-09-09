import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { theme } from "../lib/theme";
import { registerForPushNotifications } from "../lib/notifications";

// v1 is single-user (see docs/vps-monitor-app-plan.md, "Auth: simpel dulu").
const LOCAL_USER_ID = "jamuin-monitor-owner";

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications(LOCAL_USER_ID).catch((err) =>
      console.warn("[notifications] registration failed:", err),
    );
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bg },
          headerTintColor: theme.colors.fg,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "JAMUIN MONITOR" }} />
        <Stack.Screen name="vps/[id]" options={{ title: "VPS DETAIL" }} />
        <Stack.Screen name="vps/new" options={{ title: "ADD VPS", presentation: "modal" }} />
      </Stack>
    </>
  );
}
