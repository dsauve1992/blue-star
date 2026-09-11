import { useMemo, useState } from "react";
import type { MomentumLeader } from "../api/momentum-leaders.client";
import { useRsRatings } from "./use-rs-ratings";

export type LeaderSortKey = "rs" | "ig" | "perf1M" | "perf3M" | "perf6M";

export const LEADER_SORT_OPTIONS: { value: LeaderSortKey; label: string }[] = [
  { value: "rs", label: "RS rating" },
  { value: "ig", label: "IG rating" },
  { value: "perf1M", label: "Perf 1M" },
  { value: "perf3M", label: "Perf 3M" },
  { value: "perf6M", label: "Perf 6M" },
];

export interface LeaderRsRatings {
  rsRating: number;
  industryGroupRsRating: number | null;
}

export function useSortedLeaders(leaders: MomentumLeader[]) {
  const [sortKey, setSortKey] = useState<LeaderSortKey>("rs");

  const symbols = useMemo(() => leaders.map((l) => l.symbol), [leaders]);
  const { data: rsData } = useRsRatings(symbols);

  const rsBySymbol = useMemo(() => {
    const map = new Map<string, LeaderRsRatings>();
    for (const r of rsData?.ratings ?? []) {
      map.set(r.symbol, {
        rsRating: r.rsRating,
        industryGroupRsRating: r.industryGroupRsRating,
      });
    }
    return map;
  }, [rsData]);

  const sortedLeaders = useMemo(() => {
    const valueOf = (leader: MomentumLeader): number | null | undefined => {
      switch (sortKey) {
        case "rs":
          return rsBySymbol.get(leader.symbol)?.rsRating;
        case "ig":
          return rsBySymbol.get(leader.symbol)?.industryGroupRsRating;
        case "perf1M":
          return leader.perf1M;
        case "perf3M":
          return leader.perf3M;
        case "perf6M":
          return leader.perf6M;
      }
    };
    return [...leaders].sort((a, b) => {
      const va = valueOf(a) ?? Number.NEGATIVE_INFINITY;
      const vb = valueOf(b) ?? Number.NEGATIVE_INFINITY;
      return vb - va || b.rsScore - a.rsScore;
    });
  }, [leaders, sortKey, rsBySymbol]);

  return { sortKey, setSortKey, sortedLeaders, rsBySymbol };
}
