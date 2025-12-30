import ReactECharts from 'echarts-for-react';
import { Card } from 'src/global/design-system';
import { useTheme } from 'src/global/design-system';
import type { SectorRotationDataPoint } from '../api/sector-rotation.client';
import { useMemo } from 'react';

interface SectorRotationRRGChartProps {
  dataPoints: SectorRotationDataPoint[];
  trailWeeks?: number;
  startDate?: Date | null;
  endDate?: Date | null;
}

export function SectorRotationRRGChart({
  dataPoints,
  trailWeeks = 12,
  startDate,
  endDate,
}: SectorRotationRRGChartProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const filteredDataPoints = useMemo(() => {
    if (!startDate || !endDate) {
      const latestDate = new Date(
        Math.max(...dataPoints.map((p) => new Date(p.date).getTime())),
      );
      const fiveWeeksAgo = new Date(latestDate);
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 5 * 7);
      return dataPoints.filter((p) => {
        const pointDate = new Date(p.date);
        return (
          pointDate.getTime() >= fiveWeeksAgo.getTime() &&
          pointDate.getTime() <= latestDate.getTime()
        );
      });
    }

    return dataPoints.filter((p) => {
      const pointDate = new Date(p.date);
      return (
        pointDate.getTime() >= startDate.getTime() &&
        pointDate.getTime() <= endDate.getTime()
      );
    });
  }, [dataPoints, startDate, endDate]);

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No data available</p>
      </Card>
    );
  }

  const latestDate = new Date(
    Math.max(...filteredDataPoints.map((p) => new Date(p.date).getTime())),
  );

  const sectorSymbols = Array.from(
    new Set(filteredDataPoints.map((p) => p.sectorSymbol)),
  );

  const seriesData = sectorSymbols.map((symbol) => {
    const symbolPoints = filteredDataPoints
      .filter((p) => p.sectorSymbol === symbol)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
  }).filter((d): d is NonNullable<typeof d> => d !== null);

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '10%',
      right: '10%',
      top: '10%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Relative Trend (X)',
      nameLocation: 'middle',
      nameGap: 30,
      splitLine: {
        lineStyle: {
          color: isDarkMode ? '#374151' : '#e5e7eb',
        },
      },
      axisLine: {
        lineStyle: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
        },
      },
    },
    yAxis: {
      type: 'value',
      name: 'Relative Momentum (Y)',
      nameLocation: 'middle',
      nameGap: 50,
      splitLine: {
        lineStyle: {
          color: isDarkMode ? '#374151' : '#e5e7eb',
        },
      },
      axisLine: {
        lineStyle: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
        },
      },
    },
    series: [
      {
        type: 'scatter',
        data: seriesData.map((d) => ({
          name: d.name,
          value: d.value,
          symbolSize: d.symbolSize,
          itemStyle: d.itemStyle,
        })),
        label: {
          show: true,
          position: 'right',
          formatter: '{b}',
          fontSize: 10,
          color: isDarkMode ? '#d1d5db' : '#374151',
        },
      },
      ...seriesData.map((d, index) => ({
        type: 'line',
        name: `${d.name} trail`,
        data: d.trail.map((point) => point),
        lineStyle: {
          color: getQuadrantColor(d.latestPoint.quadrant),
          width: 1.5,
          opacity: 0.4,
          type: 'dashed',
        },
        symbol: 'none',
        z: index + 1,
        animation: false,
        tooltip: {
          show: false,
        },
      })),
    ],
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesType === 'scatter') {
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
        return '';
      },
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '5%',
        style: {
          text: 'Leading',
          fill: getQuadrantColor('Leading'),
          fontSize: 12,
          fontWeight: 'bold',
        },
        z: 100,
      },
      {
        type: 'text',
        right: '5%',
        top: 'center',
        style: {
          text: 'Weakening',
          fill: getQuadrantColor('Weakening'),
          fontSize: 12,
          fontWeight: 'bold',
        },
        z: 100,
      },
      {
        type: 'text',
        left: 'center',
        bottom: '5%',
        style: {
          text: 'Lagging',
          fill: getQuadrantColor('Lagging'),
          fontSize: 12,
          fontWeight: 'bold',
        },
        z: 100,
      },
      {
        type: 'text',
        left: '5%',
        top: 'center',
        style: {
          text: 'Improving',
          fill: getQuadrantColor('Improving'),
          fontSize: 12,
          fontWeight: 'bold',
        },
        z: 100,
      },
    ],
  };

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
        style={{ height: '600px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </Card>
  );
}

function getQuadrantColor(quadrant: string): string {
  switch (quadrant) {
    case 'Leading':
      return '#10b981';
    case 'Weakening':
      return '#f59e0b';
    case 'Lagging':
      return '#ef4444';
    case 'Improving':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
}

