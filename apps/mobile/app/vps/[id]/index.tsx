import { useCallback, useEffect, useState } from "react";
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../../lib/supabase";
import { theme } from "../../../lib/theme";
import { useVpsUptime } from "../../../lib/useVpsUptime";
import { UptimeHeatmap } from "../../../components/UptimeHeatmap";
import type { Incident, Service, Vps } from "../../../lib/types";

function formatPct(pct: number | null | undefined) {
  return pct == null ? "—" : `${pct}%`;
}

export default function VpsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vps, setVps] = useState<Vps | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const { summary: uptime } = useVpsUptime(id);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: vpsRow }, { data: serviceRows }, { data: incidentRows }] = await Promise.all([
      supabase.from("vps").select("*").eq("id", id).single(),
      supabase.from("services").select("*").eq("vps_id", id).order("name"),
      supabase
        .from("incidents")
        .select("*")
        .eq("vps_id", id)
        .order("started_at", { ascending: false })
        .limit(20),
    ]);
    setVps(vpsRow as Vps);
    setServices((serviceRows as Service[]) ?? []);
    setIncidents((incidentRows as Incident[]) ?? []);
  }, [id]);

  // Reload whenever this screen regains focus — e.g. coming back from
  // add/edit service, so the list reflects the change without a manual pull.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!vps) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{vps.label}</Text>
        <Text style={styles.sub}>{vps.primary_domain ?? vps.name}</Text>
        <Text style={styles.uptimeLine}>
          24H: {formatPct(uptime?.uptime_24h)}   7D: {formatPct(uptime?.uptime_7d)}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>UPTIME (LAST 12 WEEKS)</Text>
      <UptimeHeatmap daily={uptime?.daily ?? []} />

      <View style={[styles.sectionHeader, { marginTop: theme.spacing(2) }]}>
        <Text style={styles.sectionTitle}>SERVICES</Text>
        <Link href={{ pathname: "/vps/[id]/service/new", params: { id: id! } }} asChild>
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>+ ADD SERVICE</Text>
          </Pressable>
        </Link>
      </View>
      <FlatList
        data={services}
        keyExtractor={(s) => s.id}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.empty}>NO SERVICES YET.</Text>}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: "/vps/[id]/service/[serviceId]", params: { id: id!, serviceId: item.id } }}
            asChild
          >
            <Pressable style={styles.row}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>{item.domain}{item.health_check_path}</Text>
            </Pressable>
          </Link>
        )}
      />

      <Text style={styles.sectionTitle}>INCIDENT HISTORY</Text>
      <FlatList
        data={incidents}
        keyExtractor={(i) => i.id}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.empty}>NO INCIDENTS RECORDED.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {new Date(item.started_at).toLocaleString()}
              {item.ended_at ? ` → ${new Date(item.ended_at).toLocaleString()}` : " (ONGOING)"}
            </Text>
            <Text style={styles.rowSub}>
              {item.duration_minutes != null ? `${item.duration_minutes} min downtime` : "still down"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(2) },
  header: { borderWidth: theme.borderWidth, borderColor: theme.colors.border, padding: theme.spacing(1.5), marginBottom: theme.spacing(2) },
  title: { fontFamily: "monospace", fontWeight: "900", fontSize: 18, color: theme.colors.fg },
  sub: { fontFamily: "monospace", fontSize: 12, color: theme.colors.fg, marginTop: 2 },
  uptimeLine: { fontFamily: "monospace", fontWeight: "700", fontSize: 12, color: theme.colors.fg, marginTop: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing(1) },
  sectionTitle: { fontFamily: "monospace", fontWeight: "900", fontSize: 13, marginBottom: theme.spacing(1), color: theme.colors.fg },
  addButton: { borderWidth: theme.borderWidth, borderColor: theme.colors.border, paddingVertical: 4, paddingHorizontal: 8 },
  addButtonText: { fontFamily: "monospace", fontWeight: "900", fontSize: 11, color: theme.colors.fg },
  empty: { fontFamily: "monospace", fontSize: 12, color: theme.colors.fg, marginBottom: theme.spacing(2) },
  row: { borderWidth: theme.borderWidth, borderColor: theme.colors.border, padding: theme.spacing(1), marginBottom: theme.spacing(1) },
  rowTitle: { fontFamily: "monospace", fontWeight: "700", fontSize: 13, color: theme.colors.fg },
  rowSub: { fontFamily: "monospace", fontSize: 11, color: theme.colors.fg, marginTop: 2 },
});
