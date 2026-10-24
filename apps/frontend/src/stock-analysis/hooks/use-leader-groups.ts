import { useMemo } from "react";
import {
  leaderTickerFullName,
  type MomentumLeader,
} from "../api/momentum-leaders.client";
import type {
  QuadrantType,
  SectorStatus,
} from "src/sector-rotation/api/sector-rotation.client";
import { getIndustryGroupQuadrant } from "src/sector-rotation/utils/industry-group-utils";
import type { LeaderRsRatings } from "./use-sorted-leaders";

export type LeaderGroupBy = "none" | "industryGroup" | "theme";

export const LEADER_GROUP_BY_OPTIONS: {
  value: LeaderGroupBy;
  label: string;
}[] = [
  { value: "none", label: "No grouping" },
  { value: "industryGroup", label: "Industry group" },
  { value: "theme", label: "Theme" },
];

const UNGROUPED_INDUSTRY = "No industry group";
const UNGROUPED_THEME = "No theme";

export interface LeaderGroup {
  key: string;
  label: string | null;
  industryGroupRsRating: number | null;
  quadrant: QuadrantType | null;
  leaders: MomentumLeader[];
}

function groupKeysOf(leader: MomentumLeader, groupBy: LeaderGroupBy): string[] {
  switch (groupBy) {
    case "none":
      return ["all"];
    case "industryGroup":
      return [leader.industryGroup ?? UNGROUPED_INDUSTRY];
    case "theme":
      return leader.themes.length > 0 ? leader.themes : [UNGROUPED_THEME];
  }
}

function compareGroups(a: LeaderGroup, b: LeaderGroup): number {
  const aUngrouped = a.key === UNGROUPED_INDUSTRY || a.key === UNGROUPED_THEME;
  const bUngrouped = b.key === UNGROUPED_INDUSTRY || b.key === UNGROUPED_THEME;
  if (aUngrouped !== bUngrouped) return aUngrouped ? 1 : -1;
  return (
    (b.industryGroupRsRating ?? -1) - (a.industryGroupRsRating ?? -1) ||
    b.leaders.length - a.leaders.length
  );
}

export function useLeaderGroups(
  sortedLeaders: MomentumLeader[],
  groupBy: LeaderGroupBy,
  rsBySymbol: Map<string, LeaderRsRatings>,
  industryGroupStatuses: SectorStatus[],
) {
  const groups = useMemo(() => {
    const byKey = new Map<string, MomentumLeader[]>();
    for (const leader of sortedLeaders) {
      for (const key of groupKeysOf(leader, groupBy)) {
        byKey.set(key, [...(byKey.get(key) ?? []), leader]);
      }
    }
    const result: LeaderGroup[] = [...byKey].map(([key, leaders]) => ({
      key,
      label: groupBy === "none" ? null : key,
      industryGroupRsRating:
        groupBy === "industryGroup"
          ? (rsBySymbol.get(leaders[0].symbol)?.industryGroupRsRating ?? null)
          : null,
      quadrant:
        groupBy === "industryGroup"
          ? getIndustryGroupQuadrant(
              leaders[0].industryGroup,
              industryGroupStatuses,
            )
          : null,
      leaders,
    }));
    return result.sort(compareGroups);
  }, [sortedLeaders, groupBy, rsBySymbol, industryGroupStatuses]);

  const orderedLeaders = useMemo(() => {
    const seen = new Set<string>();
    return groups
      .flatMap((g) => g.leaders)
      .filter((leader) => {
        const ticker = leaderTickerFullName(leader);
        if (seen.has(ticker)) return false;
        seen.add(ticker);
        return true;
      });
  }, [groups]);

  return { groups, orderedLeaders };
}
