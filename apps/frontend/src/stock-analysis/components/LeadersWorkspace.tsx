import { useEffect, useRef } from "react";
import { BarChart3 } from "lucide-react";
import {
  leaderTickerFullName,
  type MomentumLeader,
} from "../api/momentum-leaders.client";
import type { LeaderGroup } from "../hooks/use-leader-groups";
import type { LeaderRsRatings } from "../hooks/use-sorted-leaders";
import { LeaderChartCard } from "./LeaderChartCard";
import { LeaderDetail } from "./LeaderDetail";
import { LeaderGroupHeader } from "./LeaderGroupHeader";

interface LeadersWorkspaceProps {
  groups: LeaderGroup[];
  orderedLeaders: MomentumLeader[];
  rsBySymbol: Map<string, LeaderRsRatings>;
  selectedTicker: string | null;
  onSelect: (tickerFullName: string) => void;
}

export function LeadersWorkspace({
  groups,
  orderedLeaders,
  rsBySymbol,
  selectedTicker,
  onSelect,
}: LeadersWorkspaceProps) {
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const selectedLeader = orderedLeaders.find(
    (leader) => leaderTickerFullName(leader) === selectedTicker,
  );

  useEffect(() => {
    if (!selectedTicker) return;
    scrollRootRef.current
      ?.querySelector(`[data-ticker="${CSS.escape(selectedTicker)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedTicker]);

  return (
    <div className="flex-1 min-w-0 flex">
      <div
        ref={scrollRootRef}
        className="w-[55%] shrink-0 overflow-y-auto px-4 pb-4"
      >
        {groups.map((group) => (
          <section key={group.key}>
            {group.label && (
              <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-slate-900/95 border-b border-slate-700/50">
                <LeaderGroupHeader group={group} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-3">
              {group.leaders.map((leader) => {
                const ticker = leaderTickerFullName(leader);
                return (
                  <LeaderChartCard
                    key={`${group.key}:${ticker}`}
                    leader={leader}
                    rsRating={rsBySymbol.get(leader.symbol)?.rsRating}
                    scrollRootRef={scrollRootRef}
                    isSelected={ticker === selectedTicker}
                    onOpen={onSelect}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside className="flex-1 min-w-0 border-l border-slate-700/50 bg-slate-900/30">
        {selectedLeader ? (
          <LeaderDetail key={selectedTicker} leader={selectedLeader} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <BarChart3 className="w-10 h-10 text-slate-600" />
            <p className="text-sm text-slate-400">
              Select a chart to see its details
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
