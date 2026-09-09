import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { supabase } from "../../../../lib/supabase";
import { theme } from "../../../../lib/theme";
import { DEFAULT_METRIC_CONFIG, METRIC_LABELS, METRIC_TYPES } from "../../../../lib/metricConfigs";
import type { MetricType, Service, ServiceMetricConfig } from "../../../../lib/types";

export default function EditServiceScreen() {
  const { serviceId } = useLocalSearchParams<{ id: string; serviceId: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [healthCheckPath, setHealthCheckPath] = useState("/");
  const [statusCodes, setStatusCodes] = useState("200");
  const [configs, setConfigs] = useState<Record<MetricType, ServiceMetricConfig>>(
    {} as Record<MetricType, ServiceMetricConfig>,
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!serviceId) return;

    const { data: serviceRow } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .single();
    if (!serviceRow) return;

    setService(serviceRow as Service);
    setName(serviceRow.name);
    setDomain(serviceRow.domain);
    setHealthCheckPath(serviceRow.health_check_path);
    setStatusCodes((serviceRow.expected_status_codes as number[]).join(", "));

    const { data: configRows } = await supabase
      .from("service_metric_configs")
      .select("*")
      .eq("service_id", serviceId);

    const byType = {} as Record<MetricType, ServiceMetricConfig>;
    for (const metricType of METRIC_TYPES) {
      const existing = (configRows as ServiceMetricConfig[] | null)?.find(
        (c) => c.metric_type === metricType,
      );
      byType[metricType] = existing ?? {
        id: "",
        service_id: serviceId,
        metric_type: metricType,
        ...DEFAULT_METRIC_CONFIG[metricType],
      };
    }
    setConfigs(byType);
  }, [serviceId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleMetric = (metricType: MetricType, enabled: boolean) => {
    setConfigs((prev) => ({ ...prev, [metricType]: { ...prev[metricType], enabled } }));
  };

  const save = async () => {
    if (!service) return;
    setSaving(true);

    const expectedStatusCodes = statusCodes
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    const { error: serviceErr } = await supabase
      .from("services")
      .update({
        name: name.trim(),
        domain: domain.trim(),
        health_check_path: healthCheckPath.trim() || "/",
        expected_status_codes: expectedStatusCodes.length ? expectedStatusCodes : [200],
      })
      .eq("id", service.id);

    if (serviceErr) {
      setSaving(false);
      Alert.alert("Failed to save", serviceErr.message);
      return;
    }

    const { error: configErr } = await supabase.from("service_metric_configs").upsert(
      METRIC_TYPES.map((metricType) => ({
        service_id: service.id,
        metric_type: metricType,
        enabled: configs[metricType].enabled,
        interval_minutes: configs[metricType].interval_minutes,
      })),
      { onConflict: "service_id,metric_type" },
    );

    setSaving(false);
    if (configErr) {
      Alert.alert("Saved service, but metric toggles failed", configErr.message);
      return;
    }
    router.back();
  };

  const remove = () => {
    if (!service) return;
    Alert.alert("Delete service", `Delete "${service.name}"? This also removes its check history.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("services").delete().eq("id", service.id);
          if (error) {
            Alert.alert("Failed to delete", error.message);
            return;
          }
          router.back();
        },
      },
    ]);
  };

  if (!service) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: theme.spacing(2) }}>
      <Text style={styles.fieldLabel}>NAME</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.fieldLabel}>DOMAIN</Text>
      <TextInput style={styles.input} value={domain} onChangeText={setDomain} autoCapitalize="none" />

      <Text style={styles.fieldLabel}>HEALTH CHECK PATH</Text>
      <TextInput
        style={styles.input}
        value={healthCheckPath}
        onChangeText={setHealthCheckPath}
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>EXPECTED STATUS CODES (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={statusCodes}
        onChangeText={setStatusCodes}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={[styles.fieldLabel, { marginTop: theme.spacing(3) }]}>METRICS</Text>
      {METRIC_TYPES.map((metricType) => (
        <View key={metricType} style={styles.metricRow}>
          <Text style={styles.metricLabel}>{METRIC_LABELS[metricType]}</Text>
          <Switch
            value={configs[metricType]?.enabled ?? false}
            onValueChange={(v) => toggleMetric(metricType, v)}
          />
        </View>
      ))}

      <Pressable style={styles.saveButton} onPress={save} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? "SAVING..." : "SAVE"}</Text>
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={remove}>
        <Text style={styles.deleteButtonText}>DELETE SERVICE</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  fieldLabel: { fontFamily: "monospace", fontWeight: "700", fontSize: 11, marginTop: theme.spacing(2), color: theme.colors.fg },
  input: {
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    padding: theme.spacing(1),
    marginTop: theme.spacing(0.5),
    fontFamily: "monospace",
    color: theme.colors.fg,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    padding: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  metricLabel: { fontFamily: "monospace", fontWeight: "700", fontSize: 12, color: theme.colors.fg, flex: 1 },
  saveButton: {
    marginTop: theme.spacing(3),
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.fg,
    padding: theme.spacing(1.5),
    alignItems: "center",
  },
  saveButtonText: { color: "#FFFFFF", fontFamily: "monospace", fontWeight: "900" },
  deleteButton: {
    marginTop: theme.spacing(1.5),
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    padding: theme.spacing(1.5),
    alignItems: "center",
  },
  deleteButtonText: { color: theme.colors.fg, fontFamily: "monospace", fontWeight: "900" },
});
