import { useLayoutEffect, useRef, useState } from "react";
import { Card } from "src/global/design-system";
import { useTheme } from "src/global/design-system";
import type { SectorRotationDataPoint } from "../api/sector-rotation.client";
import { parseLocalDate } from "../utils/parse-local-date";

const QUADRANT_STYLES = [
  { quadrant: "Leading", code: "Ld", color: "bg-green-500" },
  { quadrant: "Weakening", code: "Wk", color: "bg-yellow-500" },
  { quadrant: "Lagging", code: "Lg", color: "bg-red-500" },
  { quadrant: "Improving", code: "Im", color: "bg-blue-500" },
] as const;

const UNKNOWN_QUADRANT_STYLE = { code: "?", color: "bg-gray-500" };

const quadrantStyle = (quadrant: string) =>
  QUADRANT_STYLES.find((style) => style.quadrant === quadrant) ??
  UNKNOWN_QUADRANT_STYLE;

interface SectorRotationTimelineProps {
  dataPoints: SectorRotationDataPoint[];
  enabledSectors: Set<string>;
  onToggleSector: (sectorSymbol: string) => void;
  sectorNames?: Record<string, string>;
  windowStart?: Date | null;
  windowEnd?: Date | null;
}

const STICKY_COLUMN_EDGE_SHADOW =
  "after:pointer-events-none after:absolute after:inset-y-0 after:-right-3 after:w-3 after:bg-gradient-to-r after:from-slate-900/40 after:to-transparent dark:after:from-black/60";

function scrollWindowIntoView(container: HTMLDivElement) {
  const windowHeaders = container.querySelectorAll("th[data-in-window]");
  if (windowHeaders.length === 0) {
    container.scrollLeft = container.scrollWidth;
    return;
  }
  const containerRect = container.getBoundingClientRect();
  const stickyWidth =
    container.querySelector("th")?.getBoundingClientRect().width ?? 0;
  const firstRect = windowHeaders[0].getBoundingClientRect();
  const lastRect =
    windowHeaders[windowHeaders.length - 1].getBoundingClientRect();
  if (lastRect.right > containerRect.right) {
    container.scrollLeft += lastRect.right - containerRect.right;
  } else if (firstRect.left < containerRect.left + stickyWidth) {
    container.scrollLeft -= containerRect.left + stickyWidth - firstRect.left;
  }
}

export function SectorRotationTimeline({
  dataPoints,
  enabledSectors,
  onToggleSector,
  sectorNames = {},
  windowStart,
  windowEnd,
}: SectorRotationTimelineProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledSideways, setIsScrolledSideways] = useState(false);
  const stickyColumnShadow = isScrolledSideways
    ? STICKY_COLUMN_EDGE_SHADOW
    : "";

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (container) scrollWindowIntoView(container);
  }, [dataPoints, windowStart, windowEnd]);

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-slate-500 dark:text-slate-400">No data available</p>
      </Card>
    );
  }

  const uniqueDates = Array.from(new Set(dataPoints.map((p) => p.date))).sort();

  const isInWindow = (date: string) => {
    if (!windowStart || !windowEnd) return false;
    const time = parseLocalDate(date).getTime();
    return time >= windowStart.getTime() && time <= windowEnd.getTime();
  };

  const sectorSymbols = Array.from(
    new Set(dataPoints.map((p) => p.sectorSymbol)),
  ).sort();

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Quadrant Timeline</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {uniqueDates.length} weeks of data
          {windowStart && windowEnd && (
            <>
              {" · "}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                highlighted weeks
              </span>{" "}
              are plotted on the RRG
            </>
          )}
        </p>
      </div>
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto"
        onScroll={(event) =>
          setIsScrolledSideways(event.currentTarget.scrollLeft > 0)
        }
      >
        <div className="inline-block min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th
                  className={`sticky left-0 z-10 bg-white dark:bg-slate-800 border border-border p-2 text-left text-sm font-medium ${stickyColumnShadow}`}
                >
                  Sector
                </th>
                {uniqueDates.map((date) => (
                  <th
                    key={date}
                    data-in-window={isInWindow(date) || undefined}
                    className={`border border-border p-1 text-center text-xs font-medium min-w-[24px] ${
                      isInWindow(date) ? "bg-blue-600 text-white" : ""
                    }`}
                  >
                    {parseLocalDate(date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectorSymbols.map((symbol) => {
                const isEnabled = enabledSectors.has(symbol);
                const isLastEnabled = isEnabled && enabledSectors.size === 1;
                return (
                  <tr key={symbol} className={!isEnabled ? "opacity-40" : ""}>
                    <td
                      className={`sticky left-0 z-10 bg-white dark:bg-slate-800 border border-border p-2 text-sm font-medium ${stickyColumnShadow}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => onToggleSector(symbol)}
                          disabled={isLastEnabled}
                          title={
                            isLastEnabled
                              ? "At least one sector must stay plotted"
                              : undefined
                          }
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          aria-label={`Toggle ${symbol} sector`}
                        />
                        <span>
                          {sectorNames[symbol]
                            ? `${sectorNames[symbol]} (${symbol})`
                            : symbol}
                        </span>
                      </div>
                    </td>
                    {uniqueDates.map((date) => {
                      const point = dataPoints.find(
                        (p) => p.sectorSymbol === symbol && p.date === date,
                      );
                      const quadrant = point?.quadrant || "Lagging";
                      const style = quadrantStyle(quadrant);
                      return (
                        <td
                          key={`${symbol}-${date}`}
                          className={`border border-border p-1 text-center text-xs ${style.color} ${isDarkMode ? "opacity-80" : "opacity-70"}`}
                          title={`${sectorNames[symbol] ? `${sectorNames[symbol]} (${symbol})` : symbol} - ${parseLocalDate(
                            date,
                          ).toLocaleDateString()}: ${quadrant}`}
                        >
                          <span className="text-white font-bold">
                            {style.code}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {QUADRANT_STYLES.map(({ quadrant, code, color }) => (
          <div key={quadrant} className="flex items-center gap-2">
            <span
              className={`inline-flex h-5 min-w-7 items-center justify-center rounded px-1 text-xs font-bold text-white ${color}`}
            >
              {code}
            </span>
            <span>{quadrant}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
