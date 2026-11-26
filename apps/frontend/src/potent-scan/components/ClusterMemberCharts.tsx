import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useChartGridKeyboardNavigation } from "src/global/hooks/use-chart-grid-keyboard-navigation";
import type { ClusterMemberDetail } from "../api/potent-scan.client";
import { ClusterMemberChartCard } from "./ClusterMemberChartCard";
import { ClusterMemberLargeChart } from "./ClusterMemberLargeChart";

function useSectionInView(
  sectionRef: RefObject<HTMLElement | null>,
  isRendered: boolean,
) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.5 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [sectionRef, isRendered]);

  return inView;
}

export function ClusterMemberCharts({
  members,
}: {
  members: ClusterMemberDetail[];
}) {
  const activeMembers = useMemo(
    () => members.filter((member) => member.removedAt === null),
    [members],
  );
  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionInView = useSectionInView(sectionRef, activeMembers.length > 0);
  const tickerGroups = useMemo(
    () =>
      sectionInView && activeMembers.length > 0
        ? [activeMembers.map((member) => member.ticker)]
        : [],
    [activeMembers, sectionInView],
  );
  const [chosenTicker, setChosenTicker] = useState<string | null>(null);
  const selectedMember =
    activeMembers.find((member) => member.ticker === chosenTicker) ??
    activeMembers[0];
  const selectedTicker = selectedMember?.ticker ?? null;
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollToSelection = useRef(false);

  const handleKeyboardChange = useCallback((ticker: string) => {
    scrollToSelection.current = true;
    setChosenTicker(ticker);
  }, []);

  useChartGridKeyboardNavigation({
    tickerGroups,
    selectedTicker,
    onTickerChange: handleKeyboardChange,
  });

  useEffect(() => {
    if (!scrollToSelection.current || !selectedTicker) return;
    scrollToSelection.current = false;
    gridRef.current
      ?.querySelector(`[data-ticker="${CSS.escape(selectedTicker)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedTicker]);

  if (activeMembers.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        No active members to chart.
      </p>
    );
  }

  return (
    <div
      ref={sectionRef}
      className="flex h-[calc(100vh-8rem)] min-h-[32rem] flex-col overflow-hidden rounded-md border border-slate-700 bg-slate-900 md:flex-row"
    >
      <div
        ref={gridRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 md:w-[55%] md:flex-none"
      >
        <div className="grid grid-cols-1 gap-3 pt-3 md:grid-cols-2">
          {activeMembers.map((member) => (
            <ClusterMemberChartCard
              key={member.ticker}
              member={member}
              scrollRootRef={gridRef}
              isSelected={member.ticker === selectedTicker}
              onOpen={setChosenTicker}
            />
          ))}
        </div>
      </div>
      <aside className="order-first h-[55%] shrink-0 border-b border-slate-700/50 md:order-none md:h-auto md:flex-1 md:border-b-0 md:border-l">
        {selectedMember && <ClusterMemberLargeChart member={selectedMember} />}
      </aside>
    </div>
  );
}
