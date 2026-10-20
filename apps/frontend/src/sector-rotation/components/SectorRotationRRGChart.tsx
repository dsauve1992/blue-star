import ReactECharts from "echarts-for-react";
import { Card } from "src/global/design-system";
import { useTheme } from "src/global/design-system";
import type { SectorRotationDataPoint } from "../api/sector-rotation.client";
import { useMemo } from "react";
import { parseLocalDate } from "../utils/parse-local-date";
import { createRrgLabelLayout } from "../utils/rrg-label-layout";

interface SectorRotationRRGChartProps {
  dataPoints: SectorRotationDataPoint[];
  trailWeeks?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  enabledSectors?: Set<string>;
  sectorNames?: Record<string, string>;
}

export function SectorRotationRRGChart({
  dataPoints,
  trailWeeks = 12,
  startDate,
  endDate,
  enabledSectors,
  sectorNames = {},
}: SectorRotationRRGChartProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const filteredDataPoints = useMemo(() => {
    let filtered = dataPoints;

    if (enabledSectors) {
      filtered = filtered.filter((p) => enabledSectors.has(p.sectorSymbol));
    }

    if (!startDate || !endDate) {
      if (filtered.length === 0) return filtered;
      const latestDate = new Date(
        Math.max(...filtered.map((p) => parseLocalDate(p.date).getTime())),
      );
      const fiveWeeksAgo = new Date(latestDate);
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 5 * 7);
      return filtered.filter((p) => {
        const pointDate = parseLocalDate(p.date);
        return (
          pointDate.getTime() >= fiveWeeksAgo.getTime() &&
          pointDate.getTime() <= latestDate.getTime()
        );
      });
    }

    return filtered.filter((p) => {
      const pointDate = parseLocalDate(p.date);
      return (
        pointDate.getTime() >= startDate.getTime() &&
        pointDate.getTime() <= endDate.getTime()
      );
    });
  }, [dataPoints, startDate, endDate, enabledSectors]);

  const axisRanges = useMemo(() => {
    if (!dataPoints || dataPoints.length === 0) {
      return { xMin: 95, xMax: 105, yMin: 95, yMax: 105 };
    }

    const allXValues = dataPoints.map((p) => p.x);
    const allYValues = dataPoints.map((p) => p.y);

    const xMin = Math.min(...allXValues);
    const xMax = Math.max(...allXValues);
    const yMin = Math.min(...allYValues);
    const yMax = Math.max(...allYValues);

    const centerX = 100;
    const centerY = 100;

    const maxXDistance = Math.max(
      Math.abs(xMax - centerX),
      Math.abs(xMin - centerX),
    );
    const maxYDistance = Math.max(
      Math.abs(yMax - centerY),
      Math.abs(yMin - centerY),
    );

    const padding = 0.1;

    const xRange = maxXDistance * (1 + padding * 2);
    const yRange = maxYDistance * (1 + padding * 2);

    return {
      xMin: centerX - xRange,
      xMax: centerX + xRange,
      yMin: centerY - yRange,
      yMax: centerY + yRange,
    };
  }, [dataPoints]);

  const latestDate = new Date(
    Math.max(
      ...filteredDataPoints.map((p) => parseLocalDate(p.date).getTime()),
    ),
  );

  const sectorSymbols = useMemo(() => {
    return Array.from(new Set(filteredDataPoints.map((p) => p.sectorSymbol)));
  }, [filteredDataPoints]);

  const seriesData = useMemo(() => {
    return sectorSymbols
      .map((symbol) => {
        const symbolPoints = filteredDataPoints
          .filter((p) => p.sectorSymbol === symbol)
          .sort(
            (a, b) =>
              parseLocalDate(a.date).getTime() -
              parseLocalDate(b.date).getTime(),
          );

        if (symbolPoints.length === 0) {
          return null;
        }

        const latestPoint = symbolPoints[symbolPoints.length - 1];
        const trailStartIndex = Math.max(
          0,
          symbolPoints.length - trailWeeks - 1,
        );
        const trailPoints = symbolPoints.slice(trailStartIndex);

        const displayName = sectorNames[symbol]
          ? `${sectorNames[symbol]} (${symbol})`
          : symbol;
        return {
          name: displayName,
          value: [latestPoint.x, latestPoint.y],
          symbolSize: 12,
          itemStyle: {
            color: getQuadrantColor(latestPoint.quadrant),
          },
          trail: trailPoints.map((p) => [p.x, p.y]),
          latestPoint,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [sectorSymbols, filteredDataPoints, trailWeeks]);

  const option = useMemo(
    () => ({
      backgroundColor: "transparent",
      animation: false,
      grid: {
        left: 56,
        right: "10%",
        top: "10%",
        bottom: "10%",
        containLabel: false,
      },
      xAxis: {
        type: "value",
        name: "RS-Ratio",
        nameLocation: "middle",
        nameGap: 30,
        min: axisRanges.xMin,
        max: axisRanges.xMax,
        axisLabel: {
          showMinLabel: false,
          showMaxLabel: false,
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode ? "#374151" : "#e5e7eb",
          },
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode ? "#9ca3af" : "#6b7280",
          },
        },
      },
      yAxis: {
        type: "value",
        name: "RS-Momentum",
        nameLocation: "middle",
        nameGap: 30,
        min: axisRanges.yMin,
        max: axisRanges.yMax,
        axisLabel: {
          showMinLabel: false,
          showMaxLabel: false,
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode ? "#374151" : "#e5e7eb",
          },
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode ? "#9ca3af" : "#6b7280",
          },
        },
      },
      series: [
        {
          type: "scatter",
          data: seriesData.map((d) => ({
            name: d.name,
            value: d.value,
            symbolSize: d.symbolSize,
            itemStyle: d.itemStyle,
          })),
          label: {
            show: true,
            position: "right",
            formatter: "{b}",
            fontSize: 10,
            color: isDarkMode ? "#d1d5db" : "#374151",
          },
          labelLayout: createRrgLabelLayout(),
          labelLine: {
            show: true,
            lineStyle: {
              color: isDarkMode ? "#6b7280" : "#9ca3af",
            },
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: {
              color: isDarkMode ? "#4b5563" : "#9ca3af",
              width: 1,
              type: "solid",
              opacity: 0.5,
            },
            data: [
              [
                { coord: [100, axisRanges.yMin] },
                { coord: [100, axisRanges.yMax] },
              ],
              [
                { coord: [axisRanges.xMin, 100] },
                { coord: [axisRanges.xMax, 100] },
              ],
            ],
          },
          markArea: {
            silent: true,
            label: {
              show: true,
              fontSize: 12,
              fontWeight: "bold",
              distance: 10,
            },
            data: [
              [
                {
                  name: "Leading",
                  coord: [100, 100],
                  label: {
                    position: "insideTopRight",
                    color: getQuadrantColor("Leading"),
                  },
                  itemStyle: {
                    color: getQuadrantBackgroundColor("Leading", isDarkMode),
                    opacity: 0.15,
                  },
                },
                {
                  coord: [axisRanges.xMax, axisRanges.yMax],
                  itemStyle: {
                    color: getQuadrantBackgroundColor("Leading", isDarkMode),
                    opacity: 0.15,
                  },
                },
              ],
              [
                {
                  name: "Weakening",
                  coord: [100, axisRanges.yMin],
                  label: {
                    position: "insideBottomRight",
                    color: getQuadrantColor("Weakening"),
                  },
                  itemStyle: {
                    color: getQuadrantBackgroundColor("Weakening", isDarkMode),
                    opacity: 0.15,
                  },
                },
                {
                  coord: [axisRanges.xMax, 100],
                  itemStyle: {
                    color: getQuadrantBackgroundColor("Weakening", isDarkMode),
                    opacity: 0.15,
                  },
                },
              ],
              [
                {
                  name: "Lagging",
                  coord: [axisRanges.xMin, axisRanges.yMin],
                  label: {
                    position: "insideBottomLeft",
                    color: getQuadrantColor("Lagging"),
                  },
                  itemStyle: {
                    color: getQuadrantBackgroundColor("Lagging", isDarkMode),
                    opacity: 0.15,
                  },
                },
                {
                  coord: [100, 100],
                  itemStyle: {
                    color: getQuadrantBackgroundColor("Lagging", isDarkMode),
                    opacity: 0.15,
                  },
                },
              ],
              [
                {
                  name: "Improving",
                  coord: [axisRanges.xMin, 100],
                  label: {
                    position: "insideTopLeft",
                    color: getQuadrantColor("Improving"),
                  },
                  itemStyle: {
                    color: getQuadrantBackgroundColor("Improving", isDarkMode),
                    opacity: 0.15,
                  },
                },
                {
                  coord: [100, axisRanges.yMax],
                  itemStyle: {
                    color: getQuadrantBackgroundColor("Improving", isDarkMode),
                    opacity: 0.15,
                  },
                },
              ],
            ],
          },
        },
        ...seriesData.map((d, index) => ({
          type: "line",
          name: `${d.name} trail`,
          data: d.trail.map((point) => point),
          smooth: 0.3,
          lineStyle: {
            color: getQuadrantColor(d.latestPoint.quadrant),
            width: 3,
            opacity: 0.4,
            type: "dashed",
          },
          symbol: "none",
          z: index + 1,
          animation: false,
          tooltip: {
            show: false,
          },
        })),
      ],
      tooltip: {
        trigger: "item",
        formatter: (params: { seriesType?: string; name?: string }) => {
          if (params.seriesType === "scatter") {
            const point = filteredDataPoints.find((p) => {
              const displayName = sectorNames[p.sectorSymbol]
                ? `${sectorNames[p.sectorSymbol]} (${p.sectorSymbol})`
                : p.sectorSymbol;
              return displayName === params.name;
            });
            if (point) {
              return `
              <div style="padding: 8px;">
                <strong>${params.name}</strong><br/>
                Quadrant: ${point.quadrant}<br/>
                X: ${point.x.toFixed(2)}<br/>
                Y: ${point.y.toFixed(2)}<br/>
                RS: ${point.relativeStrength.toFixed(4)}<br/>
                Price: $${point.price.toFixed(2)}
              </div>
            `;
            }
          }
          return "";
        },
      },
    }),
    [seriesData, axisRanges, isDarkMode, filteredDataPoints],
  );

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No data available</p>
      </Card>
    );
  }

  if (filteredDataPoints.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No sectors selected</p>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Sector Rotation (RRG Chart)</h3>
        <p className="text-sm text-muted-foreground">
          {startDate && endDate
            ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
            : `Latest data: ${latestDate.toLocaleDateString()}`}
        </p>
      </div>
      <ReactECharts
        option={option}
        style={{ height: "600px", width: "100%" }}
        opts={{ renderer: "svg" }}
      />
    </Card>
  );
}

function getQuadrantColor(quadrant: string): string {
  switch (quadrant) {
    case "Leading":
      return "#10b981";
    case "Weakening":
      return "#f59e0b";
    case "Lagging":
      return "#ef4444";
    case "Improving":
      return "#3b82f6";
    default:
      return "#6b7280";
  }
}

function getQuadrantBackgroundColor(
  quadrant: string,
  isDarkMode: boolean,
): string {
  switch (quadrant) {
    case "Leading":
      return isDarkMode ? "#10b981" : "#10b981";
    case "Weakening":
      return isDarkMode ? "#f59e0b" : "#f59e0b";
    case "Lagging":
      return isDarkMode ? "#ef4444" : "#ef4444";
    case "Improving":
      return isDarkMode ? "#3b82f6" : "#3b82f6";
    default:
      return isDarkMode ? "#6b7280" : "#6b7280";
  }
}
