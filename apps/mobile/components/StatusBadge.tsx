import { StyleSheet, Text, View } from "react-native";
import { theme } from "../lib/theme";
import { HEALTH_ICON, type HealthState } from "../lib/health";

const SIZE = 28;

/**
 * Small B&W status box — O (up), ! (warning: up but slow), X (down),
 * ? (no data yet). Kept strictly black/white per the shared pixelated
 * style: states differ by icon + border weight/style, never by hue.
 */
export function StatusBadge({ state }: { state: HealthState }) {
  return (
    <View
      style={[
        styles.badge,
        state === "down" && styles.badgeDown,
        state === "warning" && styles.badgeWarning,
        state === "unknown" && styles.badgeUnknown,
      ]}
    >
      <Text style={[styles.icon, state === "down" && styles.iconOnDark]}>{HEALTH_ICON[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: SIZE,
    height: SIZE,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  badgeDown: { backgroundColor: theme.colors.fg },
  badgeWarning: { borderWidth: theme.borderWidth + 2 },
  badgeUnknown: { borderStyle: "dashed" },
  icon: { fontFamily: "monospace", fontWeight: "900", fontSize: 14, color: theme.colors.fg },
  iconOnDark: { color: "#FFFFFF" },
});
