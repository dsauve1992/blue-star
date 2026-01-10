import { Card } from 'src/global/design-system';
import { useTheme } from 'src/global/design-system';
import type { SectorRotationDataPoint } from '../api/sector-rotation.client';

interface SectorRotationTimelineProps {
  dataPoints: SectorRotationDataPoint[];
  enabledSectors: Set<string>;
  onToggleSector: (sectorSymbol: string) => void;
}

export function SectorRotationTimeline({
  dataPoints,
  enabledSectors,
  onToggleSector,
}: SectorRotationTimelineProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

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

  const getQuadrantColor = (quadrant: string): string => {
    switch (quadrant) {
      case 'Leading':
        return 'bg-green-500';
      case 'Weakening':
        return 'bg-yellow-500';
      case 'Lagging':
        return 'bg-red-500';
      case 'Improving':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getQuadrantLabel = (quadrant: string): string => {
    switch (quadrant) {
      case 'Leading':
        return 'L';
      case 'Weakening':
        return 'W';
      case 'Lagging':
        return 'L';
      case 'Improving':
        return 'I';
      default:
        return '?';
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Quadrant Timeline</h3>
        <p className="text-sm text-muted-foreground">
          Showing {uniqueDates.length} weeks of data
        </p>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background border border-border p-2 text-left text-sm font-medium">
                  Sector
                </th>
                {uniqueDates.map((date) => (
                  <th
                    key={date}
                    className="border border-border p-1 text-center text-xs font-medium min-w-[24px]"
                  >
                    {new Date(date).toLocaleDateString('en-US', {
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
                    <td className="sticky left-0 z-10 bg-background border border-border p-2 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => onToggleSector(symbol)}
                          className="w-4 h-4 cursor-pointer"
                          aria-label={`Toggle ${symbol} sector`}
                        />
                        <span>{symbol}</span>
                      </div>
                    </td>
                  {uniqueDates.map((date) => {
                    const point = dataPoints.find(
                      (p) => p.sectorSymbol === symbol && p.date === date,
                    );
                    const quadrant = point?.quadrant || 'Lagging';
                    return (
                      <td
                        key={`${symbol}-${date}`}
                        className={`border border-border p-1 text-center text-xs ${getQuadrantColor(
                          quadrant,
                        )} ${isDarkMode ? 'opacity-80' : 'opacity-70'}`}
                        title={`${symbol} - ${new Date(
                          date,
                        ).toLocaleDateString()}: ${quadrant}`}
                      >
                        <span className="text-white font-bold">
                          {getQuadrantLabel(quadrant)}
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
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Leading</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>Weakening</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Lagging</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Improving</span>
        </div>
      </div>
    </Card>
  );
}

