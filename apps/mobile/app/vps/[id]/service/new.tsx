import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../../../../lib/supabase";
import { theme } from "../../../../lib/theme";
import { createDefaultMetricConfigs } from "../../../../lib/metricConfigs";

export default function AddServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [healthCheckPath, setHealthCheckPath] = useState("/");
  const [statusCodes, setStatusCodes] = useState("200");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !domain.trim()) {
      Alert.alert("Missing fields", "Name and domain are required.");
      return;
    }
    const expectedStatusCodes = statusCodes
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    setSaving(true);
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        vps_id: id,
        name: name.trim(),
        domain: domain.trim(),
        health_check_path: healthCheckPath.trim() || "/",
        expected_status_codes: expectedStatusCodes.length ? expectedStatusCodes : [200],
      })
      .select()
      .single();

    if (error) {
      setSaving(false);
      Alert.alert("Failed to save", error.message);
      return;
    }

    try {
      await createDefaultMetricConfigs(service.id);
    } catch (err) {
      console.warn("[add service] failed to create default metric configs:", err);
    }

    setSaving(false);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.fieldLabel}>NAME (e.g. jamuin-web)</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.fieldLabel}>DOMAIN (e.g. www.jamuin.co)</Text>
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

      <Pressable style={styles.saveButton} onPress={save} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? "SAVING..." : "SAVE"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(2) },
  fieldLabel: { fontFamily: "monospace", fontWeight: "700", fontSize: 11, marginTop: theme.spacing(2), color: theme.colors.fg },
  input: {
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    padding: theme.spacing(1),
    marginTop: theme.spacing(0.5),
    fontFamily: "monospace",
    color: theme.colors.fg,
  },
  saveButton: {
    marginTop: theme.spacing(3),
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.fg,
    padding: theme.spacing(1.5),
    alignItems: "center",
  },
  saveButtonText: { color: "#FFFFFF", fontFamily: "monospace", fontWeight: "900" },
});
