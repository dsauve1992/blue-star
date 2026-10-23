import type { QuadrantType } from "src/sector-rotation/api/sector-rotation.client";

export function getQuadrantColor(quadrant: QuadrantType | null): string {
  switch (quadrant) {
    case "Leading":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Improving":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Weakening":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Lagging":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}
