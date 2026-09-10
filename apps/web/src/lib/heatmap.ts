import type { CheckStatus, DailyUptimeEntry } from "./types";

export type DayCellStatus = CheckStatus | "no-data";

export interface DayCell {
  date: string; // YYYY-MM-DD
  status: DayCellStatus;
}

/**
 * Fixed-length array of the last `days` days (oldest first, today last),
 * filling any day with no `checks` rows as 'no-data' — e.g. before the VPS
 * was registered, or before the checker was deployed.
 */
export function buildDayGrid(daily: DailyUptimeEntry[], days: number): DayCell[] {
  const byDay = new Map(daily.map((d) => [d.day, d.status]));
  const cells: DayCell[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, status: byDay.get(key) ?? "no-data" });
  }
  return cells;
}

/** Splits into columns of 7 (weeks), oldest-to-newest left-to-right — GitHub contribution graph layout. */
export function toWeekColumns(cells: DayCell[]): DayCell[][] {
  const columns: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7));
  }
  return columns;
}
