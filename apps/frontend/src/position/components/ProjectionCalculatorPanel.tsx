import { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "src/global/design-system";
import { useTheme } from "src/global/design-system";
import { PlanSlider } from "src/position/components/PlanSlider";
import {
  medianCagr,
  runMonteCarloPlan,
  type MonteCarloParams,
} from "src/position/lib/risk-monte-carlo";
import type { ProjectionInputsSnapshot } from "src/position/lib/projection-calculator-initial";

const MC_PATHS = 480;

function fmtMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function fmtPctSigned(x: number | null) {
  if (x == null || !Number.isFinite(x)) return "—";
  const s = x >= 0 ? "+" : "";
  return `${s}${(x * 100).toFixed(1)}%`;
}

function chartPalette(isDark: boolean) {
  return {
    text: isDark ? "#f1f5f9" : "#0f172a",
    muted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    win: "#10b981",
    loss: "#ef4444",
    accent: "#3b82f6",
    gridBg: "transparent",
  };
}

export type ProjectionCalculatorPanelProps = {
  initialSnapshot: ProjectionInputsSnapshot;
};

export function ProjectionCalculatorPanel({
  initialSnapshot,
}: ProjectionCalculatorPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const c = useMemo(() => chartPalette(isDark), [isDark]);

  const [portfolio, setPortfolio] = useState(initialSnapshot.portfolio);
  const [riskPct, setRiskPct] = useState(initialSnapshot.riskPct);
  const [winRatePct, setWinRatePct] = useState(initialSnapshot.winRatePct);
  const [rewardRisk, setRewardRisk] = useState(initialSnapshot.rewardRisk);
  const [tradesPerYear, setTradesPerYear] = useState(initialSnapshot.tradesPerYear);
  const [years, setYears] = useState(initialSnapshot.years);

  const mcParams: MonteCarloParams = useMemo(
    () => ({
      portfolio,
      riskPerTradeFraction: riskPct / 100,
      winRate: winRatePct / 100,
      rewardToRisk: rewardRisk,
      tradesPerYear,
      years,
      pathCount: MC_PATHS,
    }),
    [portfolio, rewardRisk, riskPct, tradesPerYear, winRatePct, years],
  );

  const mc = useMemo(() => runMonteCarloPlan(mcParams), [mcParams]);

  const endP90 = mc.p90[mc.p90.length - 1] ?? 0;
  const endP10 = mc.p10[mc.p10.length - 1] ?? 0;
  const endP50 = mc.p50[mc.p50.length - 1] ?? 0;
  const totalTradesPlan = years * tradesPerYear;
  const medianCagrVal = medianCagr(portfolio, endP50, years);

  const projectionChartOption = useMemo(() => {
    const labels = ["Start", ...Array.from({ length: years }, (_, i) => `Yr ${i + 1}`)];

    return {
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontFamily: "Inter, sans-serif", fontSize: 11 },
      tooltip: {
        trigger: "axis",
        backgroundColor: isDark ? "#1e293b" : "#fff",
        borderColor: c.border,
        textStyle: { color: c.text },
        valueFormatter: (v: number) => fmtMoney(v),
      },
      legend: {
        bottom: 0,
        textStyle: { color: c.muted },
        data: ["90th %ile", "Median", "10th %ile"],
      },
      grid: { left: 56, right: 20, top: 28, bottom: 56, containLabel: false },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { color: c.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: c.border } },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: c.muted,
          formatter: (v: number) => fmtMoney(v),
        },
        splitLine: { lineStyle: { color: c.border, opacity: 0.35 } },
        axisLine: { show: true, lineStyle: { color: c.border } },
      },
      series: [
        {
          name: "90th %ile",
          type: "line",
          data: mc.p90,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, type: "dashed", color: c.win },
        },
        {
          name: "Median",
          type: "line",
          data: mc.p50,
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: { width: 2.5, color: c.accent },
          itemStyle: { color: c.accent },
        },
        {
          name: "10th %ile",
          type: "line",
          data: mc.p10,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, type: "dashed", color: c.loss },
        },
      ],
    };
  }, [c, isDark, mc.p10, mc.p50, mc.p90, years]);

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Each trade: loss <span className="font-mono">−risk%×equity</span>, win{" "}
        <span className="font-mono">+risk%×R:R×equity</span>. {MC_PATHS.toLocaleString()}{" "}
        paths; seed from slider values (stable until you change inputs).
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="border-emerald-200/60 dark:border-emerald-900/50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              90th %ile
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400">
              {fmtMoney(endP90)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200/60 dark:border-red-900/50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              10th %ile
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-lg font-semibold font-mono text-red-600 dark:text-red-400">
              {fmtMoney(endP10)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Trades
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-lg font-semibold font-mono text-slate-900 dark:text-slate-50">
              {totalTradesPlan.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Median CAGR
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400">
              {fmtPctSigned(medianCagrVal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Wealth bands</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 min-h-[280px]">
          <ReactECharts
            option={projectionChartOption}
            style={{ height: "260px", width: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inputs</h3>
        <PlanSlider
          label="Portfolio ($)"
          value={portfolio}
          min={3000}
          max={500000}
          step={500}
          onChange={setPortfolio}
          format={(v) => fmtMoney(v)}
        />
        <PlanSlider
          label="Risk per trade (% of equity)"
          value={riskPct}
          min={0.1}
          max={3}
          step={0.05}
          onChange={setRiskPct}
          format={(v) => `${v.toFixed(2)}%`}
        />
        <PlanSlider
          label="Win rate (%)"
          value={winRatePct}
          min={5}
          max={70}
          step={1}
          onChange={setWinRatePct}
          format={(v) => `${v}%`}
        />
        <PlanSlider
          label="Reward : risk (R on wins)"
          value={rewardRisk}
          min={1}
          max={8}
          step={0.1}
          onChange={setRewardRisk}
          format={(v) => `1 : ${v.toFixed(1)}`}
        />
        <PlanSlider
          label="Trades per year"
          value={tradesPerYear}
          min={20}
          max={250}
          step={5}
          onChange={setTradesPerYear}
          format={(v) => `${v}`}
        />
        <PlanSlider
          label="Years"
          value={years}
          min={1}
          max={25}
          step={1}
          onChange={setYears}
          format={(v) => `${v} yrs`}
        />
      </div>
    </div>
  );
}
