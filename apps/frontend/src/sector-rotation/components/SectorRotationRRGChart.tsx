import ReactECharts from "echarts-for-react";
import { Card } from "src/global/design-system";
import { useTheme } from "src/global/design-system";
import type { SectorRotationDataPoint } from "../api/sector-rotation.client";
import { useMemo } from "react";

interface SectorRotationRRGChartProps {
  dataPoints: SectorRotationDataPoint[];
  trailWeeks?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  enabledSectors?: Set<string>;
}

export function SectorRotationRRGChart({
  dataPoints,
  trailWeeks = 12,
  startDate,
  endDate,
  enabledSectors,
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
        Math.max(...filtered.map((p) => new Date(p.date).getTime())),
      );
      const fiveWeeksAgo = new Date(latestDate);
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 5 * 7);
      return filtered.filter((p) => {
        const pointDate = new Date(p.date);
        return (
          pointDate.getTime() >= fiveWeeksAgo.getTime() &&
          pointDate.getTime() <= latestDate.getTime()
        );
      });
    }

    return filtered.filter((p) => {
      const pointDate = new Date(p.date);
      return (
        pointDate.getTime() >= startDate.getTime() &&
        pointDate.getTime() <= endDate.getTime()
      );
    });
  }, [dataPoints, startDate, endDate, enabledSectors]);

  const axisRanges = useMemo(() => {
    if (!filteredDataPoints || filteredDataPoints.length === 0) {
      return { xMin: 95, xMax: 105, yMin: 95, yMax: 105 };
    }

    const allXValues = filteredDataPoints.map((p) => p.x);
    const allYValues = filteredDataPoints.map((p) => p.y);

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

    const padding = 0.15;
    const minRange = 20;

    const xRange = Math.min(maxXDistance * (1 + padding * 2), minRange);
    const yRange = Math.min(maxYDistance * (1 + padding * 2), minRange);

    return {
      xMin: centerX - xRange,
      xMax: centerX + xRange,
      yMin: centerY - yRange,
      yMax: centerY + yRange,
    };
  }, [filteredDataPoints]);

  const latestDate = new Date(
    Math.max(...filteredDataPoints.map((p) => new Date(p.date).getTime())),
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
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
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

        return {
          name: symbol,
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
        left: "10%",
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
            data: [
              [
                {
                  coord: [100, 100],
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
                  coord: [100, axisRanges.yMin],
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
                  coord: [axisRanges.xMin, axisRanges.yMin],
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
                  coord: [axisRanges.xMin, 100],
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
            const point = filteredDataPoints.find(
              (p) => p.sectorSymbol === params.name,
            );
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
      graphic: [
        {
          type: "text",
          left: "center",
          top: "5%",
          style: {
            fill: getQuadrantColor("Leading"),
            fontSize: 12,
            fontWeight: "bold",
          },
          z: 100,
        },
        {
          type: "text",
          right: "5%",
          top: "center",
          style: {
            fill: getQuadrantColor("Weakening"),
            fontSize: 12,
            fontWeight: "bold",
          },
          z: 100,
        },
        {
          type: "text",
          left: "center",
          bottom: "5%",
          style: {
            fill: getQuadrantColor("Lagging"),
            fontSize: 12,
            fontWeight: "bold",
          },
          z: 100,
        },
        {
          type: "text",
          left: "5%",
          top: "center",
          style: {
            fill: getQuadrantColor("Improving"),
            fontSize: 12,
            fontWeight: "bold",
          },
          z: 100,
        },
      ],
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
    <Card className="p-6">
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
