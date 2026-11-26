import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, X } from "lucide-react";
import {
  leaderTickerFullName,
  type MomentumLeader,
} from "../api/momentum-leaders.client";
import type { LeaderGroup } from "../hooks/use-leader-groups";
import type {
  LeaderRsRatings,
  LeaderSortKey,
} from "../hooks/use-sorted-leaders";
import { LeaderChartCard } from "./LeaderChartCard";
import { LeaderDetail } from "./LeaderDetail";
import { LeaderGroupHeader } from "./LeaderGroupHeader";

interface LeadersWorkspaceProps {
  groups: LeaderGroup[];
  orderedLeaders: MomentumLeader[];
  rsBySymbol: Map<string, LeaderRsRatings>;
  sortKey: LeaderSortKey;
  showIndustryGroup: boolean;
  selectedTicker: string | null;
  onSelect: (tickerFullName: string) => void;
}

export function LeadersWorkspace({
  groups,
  orderedLeaders,
  rsBySymbol,
  sortKey,
  showIndustryGroup,
  selectedTicker,
  onSelect,
}: LeadersWorkspaceProps) {
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const selectedLeader = orderedLeaders.find(
    (leader) => leaderTickerFullName(leader) === selectedTicker,
  );

  useEffect(() => {
    if (!selectedTicker) return;
    scrollRootRef.current
      ?.querySelector(`[data-ticker="${CSS.escape(selectedTicker)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedTicker]);

  useEffect(() => {
    if (!isSheetOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (
        sheetRef.current?.querySelector(
          '[aria-haspopup="true"][aria-expanded="true"]',
        )
      )
        return;
      setIsSheetOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isSheetOpen]);

  const openSheet = useCallback(
    (tickerFullName: string) => {
      onSelect(tickerFullName);
      setIsSheetOpen(true);
    },
    [onSelect],
  );

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col md:flex-row">
      <div
        ref={scrollRootRef}
        className="flex-1 min-h-0 md:flex-none md:w-[55%] md:shrink-0 overflow-y-auto px-4 pb-4"
      >
        {groups.map((group) => (
          <section key={group.key}>
            {group.label && (
              <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-slate-900/95 border-b border-slate-700/50">
                <LeaderGroupHeader group={group} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
              {group.leaders.map((leader) => {
                const ticker = leaderTickerFullName(leader);
                return (
                  <LeaderChartCard
                    key={`${group.key}:${ticker}`}
                    leader={leader}
                    rsRating={rsBySymbol.get(leader.symbol)?.rsRating}
                    sortKey={sortKey}
                    showIndustryGroup={showIndustryGroup}
                    scrollRootRef={scrollRootRef}
                    isSelected={ticker === selectedTicker}
                    onOpen={openSheet}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside
        ref={sheetRef}
        className={`min-w-0 border-slate-700/50 md:static md:z-auto md:block md:h-auto md:flex-1 md:rounded-none md:border-t-0 md:border-l md:bg-slate-900/30 md:shadow-none ${
          isSheetOpen
            ? "fixed inset-x-0 bottom-0 z-40 flex flex-col h-[75vh] rounded-t-2xl border-t bg-slate-900 shadow-2xl"
            : "hidden"
        }`}
      >
        <div className="md:hidden flex justify-end px-2 pt-2 shrink-0">
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setIsSheetOpen(false)}
            className="rounded-md p-1.5 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
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
