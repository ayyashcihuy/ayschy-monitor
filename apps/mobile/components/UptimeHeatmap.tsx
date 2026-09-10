import { ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "../lib/theme";
import { buildDayGrid, toWeekColumns, type DayCellStatus } from "../lib/heatmap";
import type { DailyUptimeEntry } from "../lib/types";

const CELL_SIZE = 12;
const CELL_GAP = 2;
const DAYS = 84; // 12 weeks

export function UptimeHeatmap({ daily }: { daily: DailyUptimeEntry[] }) {
  const columns = toWeekColumns(buildDayGrid(daily, DAYS));

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {columns.map((col, i) => (
            <View key={i} style={styles.column}>
              {col.map((cell) => (
                <Cell key={cell.date} status={cell.status} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <Cell status="up" />
        <Text style={styles.legendLabel}>UP ALL DAY</Text>
        <Cell status="down" />
        <Text style={styles.legendLabel}>HAD DOWNTIME</Text>
        <Cell status="no-data" />
        <Text style={styles.legendLabel}>NO DATA</Text>
      </View>
    </View>
  );
}

function Cell({ status }: { status: DayCellStatus }) {
  return (
    <View style={[styles.cell, status === "no-data" && styles.cellNoData]}>
      {status === "up" && <View style={styles.cellUpFill} />}
      {status === "down" && <View style={styles.cellDownMark} />}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: CELL_GAP, paddingVertical: 4 },
  column: { flexDirection: "column", gap: CELL_GAP },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  cellNoData: { borderStyle: "dashed" },
  cellUpFill: { width: "100%", height: "100%", backgroundColor: theme.colors.fg },
  cellDownMark: { width: "45%", height: "45%", backgroundColor: theme.colors.fg },
  legend: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: theme.spacing(1), flexWrap: "wrap" },
  legendLabel: { fontFamily: "monospace", fontSize: 10, color: theme.colors.fg, marginRight: theme.spacing(1) },
});
