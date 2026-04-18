import { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/global/design-system";
import { PageContainer } from "src/global/design-system/page-container";
import { useTheme } from "src/global/design-system";
import { ProjectionCalculatorModal } from "src/position/components/ProjectionCalculatorModal";
import {
  REFERENCE_SCENARIO,
  bookStatsToProjectionSnapshot,
} from "src/position/lib/projection-calculator-initial";
import {
  MOCK_CLOSED_TRADES,
  summarizeBook,
} from "src/position/lib/risk-mock-book";
import { Calculator } from "lucide-react";

function binWinnerRs() {
  const labels = ["1.0–1.5", "1.5–2.0", "2.0–2.5", "2.5–3.0", "3.0+"];
  const counts = new Array(labels.length).fill(0);
  for (const t of MOCK_CLOSED_TRADES) {
    if (!t.won) continue;
    const r = t.rNet;
    if (r < 1.5) counts[0]++;
    else if (r < 2) counts[1]++;
    else if (r < 2.5) counts[2]++;
    else if (r < 3) counts[3]++;
    else counts[4]++;
  }
  return { labels, counts };
}

function winnerMeanBinLabel(mean: number): string {
  if (mean < 1.5) return "1.0–1.5";
  if (mean < 2) return "1.5–2.0";
  if (mean < 2.5) return "2.0–2.5";
  if (mean < 3) return "2.5–3.0";
  return "3.0+";
}

function chartPalette(isDark: boolean) {
  return {
    text: isDark ? "#f1f5f9" : "#0f172a",
    muted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    win: "#10b981",
    loss: "#ef4444",
    accent: "#3b82f6",
    warn: "#f59e0b",
    gridBg: "transparent",
  };
}

export default function RiskManagementDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const c = useMemo(() => chartPalette(isDark), [isDark]);
  const book = useMemo(() => summarizeBook(MOCK_CLOSED_TRADES), []);
  const hist = useMemo(() => binWinnerRs(), []);

  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorInstance, setCalculatorInstance] = useState(0);

  const calculatorInitial = useMemo(
    () => bookStatsToProjectionSnapshot(book),
    [book],
  );

  const openCalculator = () => {
    setCalculatorInstance((k) => k + 1);
    setCalculatorOpen(true);
  };

  const aheadOfRefWinRate = book.winRate >= REFERENCE_SCENARIO.winRatePct / 100 - 1e-9;
  const aheadOfRefAvgR =
    book.avgWinR != null && book.avgWinR >= REFERENCE_SCENARIO.rewardRisk - 1e-9;

  const perTradeBarOption = useMemo(
    () => ({
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontFamily: "Inter, sans-serif", fontSize: 10 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: isDark ? "#1e293b" : "#fff",
        borderColor: c.border,
        textStyle: { color: c.text },
      },
      grid: { left: 44, right: 12, top: 8, bottom: 56, containLabel: false },
      xAxis: {
        type: "category",
        data: MOCK_CLOSED_TRADES.map((t, i) => `${i + 1}\n${t.symbol}`),
        axisLabel: { color: c.muted, interval: 0, fontSize: 9 },
        axisLine: { lineStyle: { color: c.border } },
      },
      yAxis: {
        type: "value",
        name: "R / trade",
        axisLabel: { color: c.muted },
        nameTextStyle: { color: c.muted },
        splitLine: { lineStyle: { color: c.border, opacity: 0.35 } },
        axisLine: { show: true, lineStyle: { color: c.border } },
      },
      series: [
        {
          type: "bar",
          data: MOCK_CLOSED_TRADES.map((t) => ({
            value: t.rNet,
            itemStyle: { color: t.won ? c.win : c.loss, borderRadius: [3, 3, 0, 0] },
          })),
          barMaxWidth: 28,
        },
      ],
    }),
    [c, isDark],
  );

  const grossROption = useMemo(
    () => ({
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontFamily: "Inter, sans-serif", fontSize: 11 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: isDark ? "#1e293b" : "#fff",
        borderColor: c.border,
        textStyle: { color: c.text },
      },
      grid: { left: 120, right: 24, top: 16, bottom: 32 },
      xAxis: {
        type: "value",
        name: "R",
        axisLabel: { color: c.muted },
        nameTextStyle: { color: c.muted },
        splitLine: { lineStyle: { color: c.border, opacity: 0.35 } },
        axisLine: { show: true, lineStyle: { color: c.border } },
      },
      yAxis: {
        type: "category",
        data: ["From winning trades", "Lost to losers (|R|)"],
        axisLabel: { color: c.muted, fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: [
            {
              value: MOCK_CLOSED_TRADES.filter((t) => t.won).reduce((s, t) => s + t.rNet, 0),
              itemStyle: { color: c.win, borderRadius: [0, 6, 6, 0] },
            },
            {
              value: MOCK_CLOSED_TRADES.filter((t) => !t.won).reduce((s, t) => s + Math.abs(t.rNet), 0),
              itemStyle: { color: c.loss, borderRadius: [0, 6, 6, 0] },
            },
          ],
          barWidth: 28,
        },
      ],
    }),
    [c, isDark],
  );

  const winRateVsBreakevenOption = useMemo(() => {
    const be = book.breakevenAtBookAvgR;
    return {
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontSize: 11 },
      tooltip: { trigger: "axis" },
      grid: { left: 24, right: 12, top: 8, bottom: 36 },
      xAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { color: c.muted, formatter: "{value}%" },
        splitLine: { lineStyle: { color: c.border, opacity: 0.35 } },
        axisLine: { lineStyle: { color: c.border } },
      },
      yAxis: {
        type: "category",
        data: ["Win rate"],
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: [{ value: book.winRate * 100, itemStyle: { color: c.accent, borderRadius: [0, 4, 4, 0] } }],
          barWidth: 32,
          markLine:
            be != null
              ? {
                  symbol: "none",
                  lineStyle: { color: c.warn, width: 2 },
                  label: {
                    formatter: `Breakeven ${(be * 100).toFixed(1)}%`,
                    color: c.warn,
                    fontSize: 10,
                  },
                  data: [{ xAxis: be * 100 }],
                }
              : undefined,
        },
      ],
    };
  }, [book.breakevenAtBookAvgR, book.winRate, c]);

  const expectancyBarOption = useMemo(() => {
    const ev = book.expectancyRPerTrade ?? 0;
    const pad = Math.max(0.35, Math.abs(ev) * 1.25, 0.05);
    const minX = Math.min(-pad, ev - 0.05);
    const maxX = Math.max(pad, ev + 0.05);
    return {
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontSize: 11 },
      tooltip: {
        trigger: "item",
        backgroundColor: isDark ? "#1e293b" : "#fff",
        borderColor: c.border,
        textStyle: { color: c.text },
      },
      grid: { left: 24, right: 24, top: 20, bottom: 48 },
      xAxis: {
        type: "value",
        min: minX,
        max: maxX,
        axisLine: { onZero: true, lineStyle: { color: c.border } },
        splitLine: { show: false },
        axisLabel: {
          color: c.muted,
          formatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`,
        },
      },
      yAxis: {
        type: "category",
        data: ["Expectancy / trade"],
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: [
            {
              value: ev,
              itemStyle: {
                color: ev > 0 ? c.win : ev < 0 ? c.loss : c.muted,
                borderRadius: ev >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4],
              },
            },
          ],
          barWidth: 40,
          markLine: {
            symbol: "none",
            lineStyle: { color: c.border, width: 2 },
            label: { formatter: "0", color: c.muted, fontSize: 10, position: "end" },
            data: [{ xAxis: 0 }],
          },
        },
      ],
    };
  }, [book.expectancyRPerTrade, c, isDark]);

  const winnerHistOption = useMemo(() => {
    const mean = book.avgWinR ?? 0;
    return {
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontSize: 11 },
      tooltip: {
        trigger: "axis",
        backgroundColor: isDark ? "#1e293b" : "#fff",
        borderColor: c.border,
        textStyle: { color: c.text },
      },
      grid: { left: 44, right: 16, top: 24, bottom: 40 },
      xAxis: {
        type: "category",
        data: hist.labels,
        axisLabel: { color: c.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: c.border } },
      },
      yAxis: {
        type: "value",
        name: "# wins",
        minInterval: 1,
        axisLabel: { color: c.muted },
        nameTextStyle: { color: c.muted },
        splitLine: { lineStyle: { color: c.border, opacity: 0.35 } },
        axisLine: { show: true, lineStyle: { color: c.border } },
      },
      series: [
        {
          type: "bar",
          data: hist.counts.map((v: number) => ({
            value: v,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 1,
                x2: 0,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "#059669" },
                  { offset: 1, color: "#34d399" },
                ],
              },
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barMaxWidth: 40,
          markLine:
            book.avgWinR != null
              ? {
                  symbol: "none",
                  lineStyle: { type: "dashed", color: c.accent, width: 2 },
                  label: {
                    formatter: `Mean ${mean.toFixed(2)}R`,
                    color: c.accent,
                    fontSize: 10,
                  },
                  data: [{ xAxis: winnerMeanBinLabel(mean) }],
                }
              : undefined,
        },
      ],
    };
  }, [book.avgWinR, c, hist.labels, hist.counts, isDark]);

  const winRateCompareOption = useMemo(() => {
    const wrBook = book.winRate * 100;
    const ref = REFERENCE_SCENARIO.winRatePct;
    const cap = Math.min(100, Math.max(8, ref, wrBook) * 1.15);
    return {
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontSize: 11 },
      tooltip: { trigger: "axis" },
      grid: { left: 48, right: 12, top: 8, bottom: 28 },
      xAxis: {
        type: "category",
        data: ["Reference", "Mock book"],
        axisLabel: { color: c.muted },
        axisLine: { lineStyle: { color: c.border } },
      },
      yAxis: {
        type: "value",
        name: "%",
        max: cap,
        axisLabel: { color: c.muted, formatter: "{value}%" },
        splitLine: { lineStyle: { color: c.border, opacity: 0.35 } },
        nameTextStyle: { color: c.muted },
      },
      series: [
        {
          type: "bar",
          data: [
            { value: ref, itemStyle: { color: c.accent, borderRadius: [4, 4, 0, 0] } },
            { value: wrBook, itemStyle: { color: c.warn, borderRadius: [4, 4, 0, 0] } },
          ],
          barWidth: 36,
        },
      ],
    };
  }, [book.winRate, c]);

  const avgRCompareOption = useMemo(() => {
    const rrBook = book.avgWinR ?? 0;
    const ref = REFERENCE_SCENARIO.rewardRisk;
    const cap = Math.max(6, ref, rrBook) * 1.12;
    return {
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontSize: 11 },
      tooltip: { trigger: "axis" },
      grid: { left: 48, right: 12, top: 8, bottom: 28 },
      xAxis: {
        type: "category",
        data: ["Reference R:R", "Mock avg win"],
        axisLabel: { color: c.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: c.border } },
      },
      yAxis: {
        type: "value",
        name: "R",
        max: cap,
        axisLabel: { color: c.muted },
        splitLine: { lineStyle: { color: c.border, opacity: 0.35 } },
        nameTextStyle: { color: c.muted },
      },
      series: [
        {
          type: "bar",
          data: [
            { value: ref, itemStyle: { color: c.accent, borderRadius: [4, 4, 0, 0] } },
            { value: rrBook, itemStyle: { color: c.warn, borderRadius: [4, 4, 0, 0] } },
          ],
          barWidth: 36,
        },
      ],
    };
  }, [book.avgWinR, c]);

  return (
    <PageContainer fullWidth className="max-w-[1600px] mx-auto">
      <ProjectionCalculatorModal
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
        initialSnapshot={calculatorInitial}
        instanceKey={calculatorInstance}
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              Risk dashboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mt-1">
              Book-level charts from mock closes. Open the projection calculator
              to run a Monte Carlo from your stats (or tweak assumptions).
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button type="button" variant="default" size="sm" onClick={openCalculator}>
              <Calculator className="h-4 w-4 mr-1.5" />
              Projection calculator
            </Button>
          </div>
        </div>

        <Alert variant="warning" className="py-3 text-sm">
          Mock trades only — wire real history when ready. Reference bars use a{" "}
          {REFERENCE_SCENARIO.winRatePct}% / 1:{REFERENCE_SCENARIO.rewardRisk}{" "}
          baseline for comparison.
        </Alert>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-7 flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Result per trade (R)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-2 min-h-[280px]">
              <ReactECharts
                option={perTradeBarOption}
                style={{ height: "260px", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-5 flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">R stacked: wins vs losses</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-2 min-h-[280px]">
              <ReactECharts
                option={grossROption}
                style={{ height: "260px", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-4 flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Win rate vs breakeven</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-2 min-h-[200px]">
              <ReactECharts
                option={winRateVsBreakevenOption}
                style={{ height: "160px", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-4 flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Expectancy / trade</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-2 min-h-[200px]">
              <ReactECharts
                option={expectancyBarOption}
                style={{ height: "160px", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-4 flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Winner size distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-2 min-h-[220px]">
              <ReactECharts
                option={winnerHistOption}
                style={{ height: "200px", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-12">
            <CardHeader>
              <CardTitle className="text-base">Reference plan vs mock book</CardTitle>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                Reference = {REFERENCE_SCENARIO.winRatePct}% win rate and 1:
                {REFERENCE_SCENARIO.rewardRisk} R:R (your Claude-style baseline).
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Win rate</p>
                <ReactECharts
                  option={winRateCompareOption}
                  style={{ height: "140px", width: "100%" }}
                  opts={{ renderer: "canvas" }}
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg win (R)</p>
                <ReactECharts
                  option={avgRCompareOption}
                  style={{ height: "140px", width: "100%" }}
                  opts={{ renderer: "canvas" }}
                />
              </div>
              <div className="sm:col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                <div
                  className={`rounded-lg px-3 py-2 ${
                    aheadOfRefWinRate
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                      : "bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100"
                  }`}
                >
                  Win rate {(book.winRate * 100).toFixed(1)}% vs reference{" "}
                  {REFERENCE_SCENARIO.winRatePct}%
                  {aheadOfRefWinRate ? " — at or above reference." : " — below reference."}
                </div>
                <div
                  className={`rounded-lg px-3 py-2 ${
                    aheadOfRefAvgR
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                      : "bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100"
                  }`}
                >
                  Avg win {book.avgWinR?.toFixed(2) ?? "—"}R vs reference 1:
                  {REFERENCE_SCENARIO.rewardRisk}
                  {aheadOfRefAvgR ? " — at or above reference." : " — below reference."}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
