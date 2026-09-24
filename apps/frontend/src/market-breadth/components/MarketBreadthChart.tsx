import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type WhitespaceData,
} from "lightweight-charts";
import { EmaBandSeries, type EmaBandData } from "./ema-band-series";
import type { MarketBreadthSession } from "../api/market-breadth.types";
import { formatPercent } from "../utils/format-percent";

const HIGHS_COLOR = "#3b82f6";
const LOWS_COLOR = "#ef4444";
const EMA10_COLOR = "#ef4444";
const EMA20_COLOR = "#3b82f6";
const PERCENT_PRICE_FORMAT = {
  type: "custom",
  minMove: 0.1,
  formatter: (value: number) => `${value.toFixed(1)}%`,
} as const;
const RATIO_PRICE_FORMAT = {
  type: "price",
  precision: 2,
  minMove: 0.01,
} as const;
const COUNT_PRICE_FORMAT = { type: "price", precision: 0, minMove: 1 } as const;
const BAND_PANE_STRETCH = 2;
const COUNT_PANE_STRETCH = 1;
const TOOLTIP_WIDTH = 200;
const TOOLTIP_OFFSET = 16;

type Accessor = (session: MarketBreadthSession) => number | null;

interface BandPane {
  kind: "band";
  label: string;
  fast: Accessor;
  slow: Accessor;
  scale: number;
  priceFormat: typeof PERCENT_PRICE_FORMAT | typeof RATIO_PRICE_FORMAT;
}

interface CountPane {
  kind: "count";
  label: string;
  highs: Accessor;
  lows: Accessor;
}

type Pane = BandPane | CountPane;

const PANES: Pane[] = [
  {
    kind: "band",
    label: "Trend breadth — stacked-MA ratio EMA10 / EMA20",
    fast: (s) => s.stackedRatioEma10,
    slow: (s) => s.stackedRatioEma20,
    scale: 100,
    priceFormat: PERCENT_PRICE_FORMAT,
  },
  {
    kind: "band",
    label: "NH / NL ratio EMA10 / EMA20",
    fast: (s) => s.ratioEma10,
    slow: (s) => s.ratioEma20,
    scale: 1,
    priceFormat: RATIO_PRICE_FORMAT,
  },
  {
    kind: "count",
    label: "52-week new highs / new lows",
    highs: (s) => s.newHighs,
    lows: (s) => s.newLows,
  },
  {
    kind: "band",
    label: "20-day high / low ratio EMA10 / EMA20",
    fast: (s) => s.ratio20Ema10,
    slow: (s) => s.ratio20Ema20,
    scale: 1,
    priceFormat: RATIO_PRICE_FORMAT,
  },
  {
    kind: "count",
    label: "20-day highs / lows",
    highs: (s) => s.newHighs20,
    lows: (s) => s.newLows20,
  },
];

type SeriesUpdater = (sessions: MarketBreadthSession[]) => void;

interface HoverState {
  x: number;
  session: MarketBreadthSession;
}

function toLinePoint(
  date: string,
  value: number | null,
  scale: number,
): LineData<Time> | WhitespaceData<Time> {
  const time = date as Time;
  return value === null ? { time } : { time, value: value * scale };
}

function toBandPoint(
  date: string,
  fast: number | null,
  slow: number | null,
  scale: number,
): EmaBandData | WhitespaceData<Time> {
  const time = date as Time;
  return fast === null || slow === null
    ? { time }
    : { time, fast: fast * scale, slow: slow * scale };
}

function toCountPoint(
  date: string,
  count: number | null,
  sign: 1 | -1,
  color: string,
) {
  const time = date as Time;
  return count === null ? { time } : { time, value: sign * count, color };
}

function addBandPane(
  chart: IChartApi,
  pane: BandPane,
  paneIndex: number,
): SeriesUpdater {
  const band = chart.addCustomSeries(
    new EmaBandSeries(),
    {
      priceFormat: pane.priceFormat,
      lastValueVisible: false,
      priceLineVisible: false,
    },
    paneIndex,
  );
  const lineOptions = {
    lineWidth: 2,
    priceFormat: pane.priceFormat,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  } as const;
  const slow = chart.addSeries(
    LineSeries,
    { ...lineOptions, color: EMA20_COLOR },
    paneIndex,
  );
  const fast = chart.addSeries(
    LineSeries,
    { ...lineOptions, color: EMA10_COLOR },
    paneIndex,
  );
  chart
    .priceScale("right", paneIndex)
    .applyOptions({ scaleMargins: { top: 0.15, bottom: 0.1 } });

  return (sessions) => {
    band.setData(
      sessions.map((s) =>
        toBandPoint(s.date, pane.fast(s), pane.slow(s), pane.scale),
      ),
    );
    slow.setData(
      sessions.map((s) => toLinePoint(s.date, pane.slow(s), pane.scale)),
    );
    fast.setData(
      sessions.map((s) => toLinePoint(s.date, pane.fast(s), pane.scale)),
    );
  };
}

function addCountPane(
  chart: IChartApi,
  pane: CountPane,
  paneIndex: number,
): SeriesUpdater {
  const highs = chart.addSeries(
    HistogramSeries,
    { base: 0, priceFormat: COUNT_PRICE_FORMAT },
    paneIndex,
  );
  const lows = chart.addSeries(
    HistogramSeries,
    { base: 0, priceFormat: COUNT_PRICE_FORMAT },
    paneIndex,
  );
  chart
    .priceScale("right", paneIndex)
    .applyOptions({ scaleMargins: { top: 0.2, bottom: 0.05 } });

  return (sessions) => {
    highs.setData(
      sessions.map((s) => toCountPoint(s.date, pane.highs(s), 1, HIGHS_COLOR)),
    );
    lows.setData(
      sessions.map((s) => toCountPoint(s.date, pane.lows(s), -1, LOWS_COLOR)),
    );
  };
}

function measurePaneTops(chart: IChartApi, container: HTMLElement): number[] {
  const containerTop = container.getBoundingClientRect().top;
  return chart
    .panes()
    .map(
      (pane) =>
        (pane.getHTMLElement()?.getBoundingClientRect().top ?? containerTop) -
        containerTop,
    );
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRatio(ratio: number | null): string {
  return ratio === null ? "—" : ratio.toFixed(2);
}

interface MarketBreadthChartProps {
  sessions: MarketBreadthSession[];
}

export function MarketBreadthChart({ sessions }: MarketBreadthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const updatersRef = useRef<SeriesUpdater[]>([]);
  const sessionsByDateRef = useRef<Map<string, MarketBreadthSession>>(
    new Map(),
  );
  const [hover, setHover] = useState<HoverState | null>(null);
  const [paneTops, setPaneTops] = useState<number[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#94a3b8",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        attributionLogo: false,
        panes: { separatorColor: "rgba(51,65,85,0.5)", enableResize: false },
      },
      grid: {
        vertLines: { color: "rgba(51,65,85,0.3)" },
        horzLines: { color: "rgba(51,65,85,0.3)" },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "rgba(148,163,184,0.4)", labelVisible: false },
        horzLine: { color: "rgba(148,163,184,0.4)" },
      },
      leftPriceScale: { visible: false },
      rightPriceScale: { visible: true, borderColor: "rgba(51,65,85,0.5)" },
      timeScale: { borderColor: "rgba(51,65,85,0.5)", timeVisible: false },
      autoSize: true,
    });
    chartRef.current = chart;

    updatersRef.current = PANES.map((pane, paneIndex) =>
      pane.kind === "band"
        ? addBandPane(chart, pane, paneIndex)
        : addCountPane(chart, pane, paneIndex),
    );
    chart.panes().forEach((pane, paneIndex) => {
      pane.setStretchFactor(
        PANES[paneIndex].kind === "band"
          ? BAND_PANE_STRETCH
          : COUNT_PANE_STRETCH,
      );
    });

    const container = containerRef.current;
    let frame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setPaneTops(measurePaneTops(chart, container)),
      );
    });
    resizeObserver.observe(container);

    const handleCrosshairMove = (param: MouseEventParams) => {
      const container = containerRef.current;
      const session =
        param.time && sessionsByDateRef.current.get(param.time as string);
      if (!param.point || !container || !session) {
        setHover(null);
        return;
      }
      const overflowsRight =
        param.point.x + TOOLTIP_OFFSET + TOOLTIP_WIDTH > container.clientWidth;
      const x = overflowsRight
        ? param.point.x - TOOLTIP_OFFSET - TOOLTIP_WIDTH
        : param.point.x + TOOLTIP_OFFSET;
      setHover({ x, session });
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
      updatersRef.current = [];
    };
  }, []);

  useEffect(() => {
    sessionsByDateRef.current = new Map(
      sessions.map((session) => [session.date, session]),
    );
    updatersRef.current.forEach((update) => update(sessions));
    chartRef.current?.timeScale().fitContent();
  }, [sessions]);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="h-[760px] w-full"
        role="img"
        aria-label="Five stacked panes sharing one date axis: the 10-day and 20-day EMAs of the stacked-MA ratio, of the new-high/new-low ratio, and of the 20-day high/low ratio, each shaded blue when EMA10 is above EMA20 and red otherwise, with mirrored histograms of daily 52-week and 20-day highs and lows"
      />
      {paneTops.map((top, paneIndex) => (
        <div
          key={PANES[paneIndex].label}
          className="pointer-events-none absolute left-2 z-10 font-mono text-[10px] text-slate-400"
          style={{ top: top + 4 }}
        >
          {PANES[paneIndex].label}
        </div>
      ))}
      {hover && (
        <div
          className="pointer-events-none absolute top-2 z-20 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-[10px] leading-4 text-slate-300 shadow-lg backdrop-blur"
          style={{ left: hover.x, width: TOOLTIP_WIDTH }}
        >
          <div className="mb-1 font-semibold text-slate-50">
            {formatDate(hover.session.date)}
          </div>
          <TooltipSection title="Trend breadth">
            <TooltipRow
              label="Stacked"
              value={
                hover.session.stackedCount === null
                  ? "—"
                  : `${hover.session.stackedCount} / ${hover.session.universeSize}`
              }
            />
            <TooltipRow
              label="Ratio"
              value={formatPercent(hover.session.stackedRatio)}
            />
            <TooltipRow
              label="EMA10"
              color={EMA10_COLOR}
              value={formatPercent(hover.session.stackedRatioEma10)}
            />
            <TooltipRow
              label="EMA20"
              color={EMA20_COLOR}
              value={formatPercent(hover.session.stackedRatioEma20)}
            />
          </TooltipSection>
          <TooltipSection title="52-week highs / lows">
            <TooltipRow
              label="Highs / lows"
              value={`${hover.session.newHighs} / ${hover.session.newLows}`}
            />
            <TooltipRow
              label="Ratio"
              value={formatRatio(hover.session.ratio)}
            />
            <TooltipRow
              label="EMA10"
              color={EMA10_COLOR}
              value={formatRatio(hover.session.ratioEma10)}
            />
            <TooltipRow
              label="EMA20"
              color={EMA20_COLOR}
              value={formatRatio(hover.session.ratioEma20)}
            />
          </TooltipSection>
          <TooltipSection title="20-day highs / lows">
            <TooltipRow
              label="Highs / lows"
              value={`${hover.session.newHighs20 ?? "—"} / ${hover.session.newLows20 ?? "—"}`}
            />
            <TooltipRow
              label="Ratio"
              value={formatRatio(hover.session.ratio20)}
            />
            <TooltipRow
              label="EMA10"
              color={EMA10_COLOR}
              value={formatRatio(hover.session.ratio20Ema10)}
            />
            <TooltipRow
              label="EMA20"
              color={EMA20_COLOR}
              value={formatRatio(hover.session.ratio20Ema20)}
            />
          </TooltipSection>
        </div>
      )}
    </div>
  );
}

function TooltipSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-1 border-t border-slate-700 pt-1">
      <div className="text-slate-400">{title}</div>
      {children}
    </div>
  );
}

function TooltipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span style={color ? { color } : undefined}>{label}</span>
      <span className="text-slate-50">{value}</span>
    </div>
  );
}
