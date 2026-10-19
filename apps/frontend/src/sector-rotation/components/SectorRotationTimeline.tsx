import { useLayoutEffect, useRef } from 'react';
import { Card } from 'src/global/design-system';
import { useTheme } from 'src/global/design-system';
import type { SectorRotationDataPoint } from '../api/sector-rotation.client';
import { parseLocalDate } from '../utils/parse-local-date';

const QUADRANT_STYLES = [
  { quadrant: 'Leading', code: 'Ld', color: 'bg-green-500' },
  { quadrant: 'Weakening', code: 'Wk', color: 'bg-yellow-500' },
  { quadrant: 'Lagging', code: 'Lg', color: 'bg-red-500' },
  { quadrant: 'Improving', code: 'Im', color: 'bg-blue-500' },
] as const;

const UNKNOWN_QUADRANT_STYLE = { code: '?', color: 'bg-gray-500' };

const quadrantStyle = (quadrant: string) =>
  QUADRANT_STYLES.find((style) => style.quadrant === quadrant) ??
  UNKNOWN_QUADRANT_STYLE;

interface SectorRotationTimelineProps {
  dataPoints: SectorRotationDataPoint[];
  enabledSectors: Set<string>;
  onToggleSector: (sectorSymbol: string) => void;
  sectorNames?: Record<string, string>;
}

export function SectorRotationTimeline({
  dataPoints,
  enabledSectors,
  onToggleSector,
  sectorNames = {},
}: SectorRotationTimelineProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (container) container.scrollLeft = container.scrollWidth;
  }, [dataPoints]);

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No data available</p>
      </Card>
    );
  }

  const uniqueDates = Array.from(
    new Set(dataPoints.map((p) => p.date)),
  ).sort();

  const sectorSymbols = Array.from(
    new Set(dataPoints.map((p) => p.sectorSymbol)),
  ).sort();

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Quadrant Timeline</h3>
        <p className="text-sm text-muted-foreground">
          Showing {uniqueDates.length} weeks of data
        </p>
      </div>
      <div ref={scrollContainerRef} className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white dark:bg-slate-800 border border-border p-2 text-left text-sm font-medium">
                  Sector
                </th>
                {uniqueDates.map((date) => (
                  <th
                    key={date}
                    className="border border-border p-1 text-center text-xs font-medium min-w-[24px]"
                  >
                    {parseLocalDate(date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectorSymbols.map((symbol) => {
                const isEnabled = enabledSectors.has(symbol);
                return (
                  <tr
                    key={symbol}
                    className={!isEnabled ? 'opacity-40' : ''}
                  >
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 border border-border p-2 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => onToggleSector(symbol)}
                          className="w-4 h-4 cursor-pointer"
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
                    const quadrant = point?.quadrant || 'Lagging';
                    const style = quadrantStyle(quadrant);
                    return (
                      <td
                        key={`${symbol}-${date}`}
                        className={`border border-border p-1 text-center text-xs ${style.color} ${isDarkMode ? 'opacity-80' : 'opacity-70'}`}
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

