import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { theme } from "../../lib/theme";

export default function AddVpsScreen() {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [primaryDomain, setPrimaryDomain] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !label.trim()) {
      Alert.alert("Missing fields", "Name and label are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vps").insert({
      name: name.trim(),
      label: label.trim(),
      primary_domain: primaryDomain.trim() || null,
    });
    setSaving(false);
    if (error) {
      Alert.alert("Failed to save", error.message);
      return;
    }
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.fieldLabel}>NAME (unique, e.g. vps-5bd9f069)</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} autoCapitalize="none" />

      <Text style={styles.fieldLabel}>LABEL (display name)</Text>
      <TextInput style={styles.input} value={label} onChangeText={setLabel} />

      <Text style={styles.fieldLabel}>PRIMARY DOMAIN (used by the external checker)</Text>
      <TextInput
        style={styles.input}
        value={primaryDomain}
        onChangeText={setPrimaryDomain}
        autoCapitalize="none"
        placeholder="e.g. www.jamuin.co"
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
