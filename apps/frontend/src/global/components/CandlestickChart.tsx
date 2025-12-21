import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import type { IChartApi, CandlestickData, Time } from 'lightweight-charts';
import type { PricePoint } from '../../position/api/market-data.client';

interface CandlestickChartProps {
  data: PricePoint[];
  symbol: string;
}

export function CandlestickChart({ data }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: 'transparent' },
        textColor: 'var(--foreground)',
      },
      grid: {
        vertLines: { color: 'var(--border)' },
        horzLines: { color: 'var(--border)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // lightweight-charts v5 API: Use addCandlestickSeries if available, otherwise use addSeries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let candlestickSeries: any;
    
    if (typeof (chart as any).addCandlestickSeries === 'function') {
      candlestickSeries = (chart as any).addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
    } else {
      // Try the v5 addSeries API with object format
      candlestickSeries = (chart as any).addSeries({
        type: 'Candlestick',
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
    }

    const chartDataMap = new Map<string, CandlestickData<Time>>();

    data.forEach((point) => {
      const date = new Date(point.date);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const timeKey = `${year}-${month}-${day}`;

      const existing = chartDataMap.get(timeKey);
      if (!existing) {
        chartDataMap.set(timeKey, {
          time: timeKey as Time,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
        });
      } else {
        existing.high = Math.max(existing.high, point.high);
        existing.low = Math.min(existing.low, point.low);
        existing.close = point.close;
      }
    });

    const chartData: CandlestickData<Time>[] = Array.from(chartDataMap.values()).sort(
      (a, b) => {
        if (a.time < b.time) return -1;
        if (a.time > b.time) return 1;
        return 0;
      },
    );

    if (chartData.length === 0) {
      console.error('No valid chart data after processing');
      chart.remove();
      return;
    }

    try {
      candlestickSeries.setData(chartData);
    } catch (error) {
      console.error('Error setting chart data:', error);
      chart.remove();
      return;
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data]);

  return (
    <div className="w-full">
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}

