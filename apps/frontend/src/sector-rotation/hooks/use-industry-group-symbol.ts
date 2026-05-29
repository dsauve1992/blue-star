import { useRotationUniverses } from "./use-rotation-universes";

const GICS_INDUSTRY_GROUP_UNIVERSE_ID = "gics-industry-group";

/**
 * Resolve a GICS industry-group name (e.g. "Semiconductors & Semiconductor
 * Equipment") to its Yahoo subindex symbol (e.g. "^SP500-4530") so it can be
 * charted as an RS benchmark exactly like SPY. The group symbol is a real
 * tradeable series in the rotation universe config.
 *
 * Returns null while loading or when the group name is missing/unmatched.
 */
export function useIndustryGroupSymbol(
  industryGroup: string | null | undefined,
): string | null {
  const { data } = useRotationUniverses();
  if (!industryGroup || !data) return null;
  const gics = data.universes.find(
    (u) => u.id === GICS_INDUSTRY_GROUP_UNIVERSE_ID,
  );
  return gics?.members.find((m) => m.name === industryGroup)?.symbol ?? null;
}
