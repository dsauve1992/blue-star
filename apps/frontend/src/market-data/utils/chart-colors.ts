export interface ChartColorPalette {
  // Candles
  up: string;
  upBody: string;
  upWick: string;
  down: string;
  downBody: string;
  downWick: string;
  // Text hierarchy
  text: string;
  textMuted: string;
  // Chrome
  border: string;
  gridHorz: string;
  gridVert: string;
  crosshair: string;
  crosshairLabel: string;
  surface: string;
  // Volume (flat mode)
  volumeUp: string;
  volumeDown: string;
  // RS indicator
  rsLine: string;
  rsSma: string;
  rsNewHigh: string;
  rsNewLow: string;
}

export const MA_DEFAULT_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

const DARK: ChartColorPalette = {
  up: "#3b82f6",
  upBody: "rgba(59, 130, 246, 0.85)",
  upWick: "rgba(59, 130, 246, 0.5)",
  down: "#ef4444",
  downBody: "rgba(239, 68, 68, 0.85)",
  downWick: "rgba(239, 68, 68, 0.5)",
  text: "#94a3b8",
  textMuted: "#64748b",
  border: "rgba(51, 65, 85, 0.5)",
  gridHorz: "rgba(51, 65, 85, 0.1)",
  gridVert: "rgba(51, 65, 85, 0)",
  crosshair: "rgba(148, 163, 184, 0.3)",
  crosshairLabel: "#334155",
  surface: "#0f172a",
  volumeUp: "rgba(59, 130, 246, 0.25)",
  volumeDown: "rgba(239, 68, 68, 0.25)",
  rsLine: "#22c55e",
  rsSma: "#f59e0b",
  rsNewHigh: "#3b82f6",
  rsNewLow: "#ef4444",
};

export function getChartColors(theme: "dark" = "dark"): ChartColorPalette {
  switch (theme) {
    case "dark":
    default:
      return DARK;
  }
}
