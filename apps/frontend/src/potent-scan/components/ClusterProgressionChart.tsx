import { useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type MouseEventParams,
} from "lightweight-charts";
import type { DailyTierCounts } from "../api/potent-scan.client";
import { TIER_SERIES } from "../constants/tier-series";
import { formatSessionDate } from "../utils/format";

export function ClusterProgressionChart({ days }: { days: DailyTierCounts[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || days.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#94a3b8",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(51,65,85,0.3)" },
        horzLines: { color: "rgba(51,65,85,0.3)" },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "rgba(148,163,184,0.4)", labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      rightPriceScale: {
        borderColor: "rgba(51,65,85,0.5)",
        scaleMargins: { top: 0.1, bottom: 0 },
      },
      timeScale: { borderColor: "rgba(51,65,85,0.5)", timeVisible: false },
      handleScroll: false,
      handleScale: false,
      autoSize: true,
    });

    for (const tier of TIER_SERIES) {
      const series = chart.addSeries(AreaSeries, {
        lineColor: tier.color,
        topColor: tier.color,
        bottomColor: tier.color,
        lineWidth: 1,
        pointMarkersVisible: days.length === 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: "price", precision: 0, minMove: 1 },
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: 0,
            maxValue: Math.max(...days.map(TIER_SERIES[0].total)),
          },
        }),
      });
      series.setData(
        days.map((day) => ({ time: day.date, value: tier.total(day) })),
      );
    }
    chart.timeScale().fitContent();

    const handleCrosshairMove = (param: MouseEventParams) =>
      setHoveredDate(typeof param.time === "string" ? param.time : null);
    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
    };
  }, [days]);

  if (days.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        No tier data yet. Tiers are recorded after each session closes.
      </p>
    );
  }

  const shownDay =
    days.find((day) => day.date === hoveredDate) ?? days[days.length - 1];

  return (
    <div className="overflow-hidden rounded-md border border-slate-700 bg-black">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-700 px-3 py-2 font-mono text-xs text-slate-300">
        <span>{formatSessionDate(shownDay.date)}</span>
        {[...TIER_SERIES].reverse().map((tier) => (
          <span key={tier.label} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: tier.color }}
            />
            {tier.label} {tier.count(shownDay)}
          </span>
        ))}
      </div>
      <div
        ref={containerRef}
        className="h-56"
        role="img"
        aria-label="Stacked area of Lead, Mediocre and Lag member counts per session"
      />
      <table className="sr-only">
        <caption>Member count per tier and session</caption>
        <thead>
          <tr>
            <th>Session</th>
            <th>Lead</th>
            <th>Mediocre</th>
            <th>Lag</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date} data-date={day.date}>
              <td>{day.date}</td>
              <td>{day.lead}</td>
              <td>{day.mediocre}</td>
              <td>{day.lag}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
