import { Link } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useVpsOverview } from "../lib/useVpsOverview";
import { theme } from "../lib/theme";
import { getHealthState } from "../lib/health";
import { StatusBadge } from "../components/StatusBadge";

export default function VpsListScreen() {
  const { data, loading, error, refresh } = useVpsOverview();

  return (
    <View style={styles.screen}>
      {error && <Text style={styles.error}>ERROR: {error}</Text>}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              NO VPS REGISTERED YET.{"\n"}TAP + ADD VPS BELOW TO START.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: "/vps/[id]", params: { id: item.id } }} asChild>
            <Pressable style={styles.row}>
              <View style={styles.rowLabel}>
                <Text style={styles.rowTitle}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.primary_domain ?? item.name}</Text>
                <Text style={styles.uptimeBadge}>
                  {item.uptime24h == null ? "24H: —" : `24H: ${item.uptime24h}%`}
                </Text>
              </View>
              <StatusBadge state={getHealthState(item.latestCheck)} />
            </Pressable>
          </Link>
        )}
      />

      <Link href="/vps/new" asChild>
        <Pressable style={styles.addButton}>
          <Text style={styles.addButtonText}>+ ADD VPS</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: theme.spacing(2), gap: theme.spacing(1.5) },
  error: { color: theme.colors.fg, padding: theme.spacing(2), fontWeight: "700" },
  empty: {
    textAlign: "center",
    marginTop: theme.spacing(6),
    color: theme.colors.fg,
    fontFamily: "monospace",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.5),
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    padding: theme.spacing(1.5),
    backgroundColor: theme.colors.bg,
  },
  rowLabel: { flex: 1 },
  rowTitle: { fontFamily: "monospace", fontWeight: "700", fontSize: 15, color: theme.colors.fg },
  rowSub: { fontFamily: "monospace", fontSize: 12, color: theme.colors.fg, marginTop: 2 },
  uptimeBadge: { fontFamily: "monospace", fontSize: 11, color: theme.colors.fg, marginTop: 2 },
  addButton: {
    margin: theme.spacing(2),
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    padding: theme.spacing(1.5),
    alignItems: "center",
    backgroundColor: theme.colors.fg,
  },
  addButtonText: { color: "#FFFFFF", fontFamily: "monospace", fontWeight: "900" },
});
