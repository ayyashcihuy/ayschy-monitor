import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { theme } from "../../lib/theme";
import type { Incident, Service, Vps } from "../../lib/types";

export default function VpsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vps, setVps] = useState<Vps | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
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
    })();
  }, [id]);

  if (!vps) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{vps.label}</Text>
        <Text style={styles.sub}>{vps.primary_domain ?? vps.name}</Text>
      </View>

      <Text style={styles.sectionTitle}>SERVICES</Text>
      <FlatList
        data={services}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={<Text style={styles.empty}>NO SERVICES YET.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSub}>{item.domain}{item.health_check_path}</Text>
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>INCIDENT HISTORY</Text>
      <FlatList
        data={incidents}
        keyExtractor={(i) => i.id}
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
  sectionTitle: { fontFamily: "monospace", fontWeight: "900", fontSize: 13, marginBottom: theme.spacing(1), color: theme.colors.fg },
  empty: { fontFamily: "monospace", fontSize: 12, color: theme.colors.fg, marginBottom: theme.spacing(2) },
  row: { borderWidth: theme.borderWidth, borderColor: theme.colors.border, padding: theme.spacing(1), marginBottom: theme.spacing(1) },
  rowTitle: { fontFamily: "monospace", fontWeight: "700", fontSize: 13, color: theme.colors.fg },
  rowSub: { fontFamily: "monospace", fontSize: 11, color: theme.colors.fg, marginTop: 2 },
});
