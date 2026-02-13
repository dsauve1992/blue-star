import type {
  SectorStatus,
  QuadrantType,
} from "src/sector-rotation/api/sector-rotation.client";

export const YFINANCE_TO_CANONICAL_SECTOR: Record<string, string> = {
  Technology: "Technology",
  Energy: "Energy",
  Industrials: "Industrial",
  "Consumer Cyclical": "Consumer Discretionary",
  "Consumer Defensive": "Consumer Staples",
  Healthcare: "Healthcare",
  "Financial Services": "Financial",
  "Basic Materials": "Materials",
  Utilities: "Utilities",
  "Real Estate": "Real Estate",
  "Communication Services": "Communication Services",
};

export function normalizeSectorName(
  yfinanceSector: string | null,
): string | null {
  if (!yfinanceSector) return null;
  return YFINANCE_TO_CANONICAL_SECTOR[yfinanceSector] ?? yfinanceSector;
}

export function isFavorableSector(
  sectorName: string | null,
  sectorStatuses: SectorStatus[],
): boolean {
  if (!sectorName) return false;
  const canonicalSector = normalizeSectorName(sectorName);
  if (!canonicalSector) return false;
  const status = sectorStatuses.find((s) => s.name === canonicalSector);
  if (!status) return false;
  return status.quadrant === "Leading" || status.quadrant === "Improving";
}

export function getSectorQuadrant(
  sectorName: string | null,
  sectorStatuses: SectorStatus[],
): QuadrantType | null {
  if (!sectorName) return null;
  const canonicalSector = normalizeSectorName(sectorName);
  if (!canonicalSector) return null;
  const status = sectorStatuses.find((s) => s.name === canonicalSector);
  return status?.quadrant ?? null;
}

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
