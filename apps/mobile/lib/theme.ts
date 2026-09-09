/**
 * Pixelated, full black/white contrast theme — agreed style for both the
 * mobile and web app (see docs/vps-monitor-app-plan.md, "Dua Repo Terpisah,
 * Desain Sama"). No gradients, no shadows, no border-radius.
 */
export const theme = {
  colors: {
    bg: "#FFFFFF",
    fg: "#000000",
    up: "#000000",
    down: "#FFFFFF",
    downBg: "#000000",
    border: "#000000",
  },
  borderWidth: 2,
  spacing: (n: number) => n * 8,
} as const;
