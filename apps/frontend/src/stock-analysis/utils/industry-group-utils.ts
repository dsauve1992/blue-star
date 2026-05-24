import type {
  SectorStatus,
  QuadrantType,
} from "src/sector-rotation/api/sector-rotation.client";

export const INDUSTRY_GROUP_UNIVERSE_ID = "gics-industry-group";

export function isFavorableIndustryGroup(
  industryGroup: string | null,
  statuses: SectorStatus[],
): boolean {
  if (!industryGroup) return false;
  const status = statuses.find((s) => s.name === industryGroup);
  if (!status) return false;
  return status.quadrant === "Leading" || status.quadrant === "Improving";
}

export function getIndustryGroupQuadrant(
  industryGroup: string | null,
  statuses: SectorStatus[],
): QuadrantType | null {
  if (!industryGroup) return null;
  const status = statuses.find((s) => s.name === industryGroup);
  return status?.quadrant ?? null;
}
