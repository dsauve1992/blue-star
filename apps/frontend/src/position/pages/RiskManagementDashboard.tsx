import { useMemo, useState, type ReactNode } from "react";
import ReactECharts from "echarts-for-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  cn,
  useTheme,
} from "src/global/design-system";
import { PageContainer } from "src/global/design-system/page-container";
import { ProjectionCalculatorModal } from "src/position/components/ProjectionCalculatorModal";
import {
  REFERENCE_SCENARIO,
  bookStatsToProjectionSnapshot,
} from "src/position/lib/projection-calculator-initial";
import { DEMO_JOURNAL_TRADES } from "src/position/lib/risk-journal-demo";
import { analyzeJournalTrades } from "src/position/lib/risk-journal-analytics";
import {
  Activity,
  Calculator,
  ChevronRight,
  Flame,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Trophy,
} from "lucide-react";

function chartPalette(isDark: boolean) {
  return {
    text: isDark ? "#f8fafc" : "#0f172a",
    muted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#dbe4f0",
    win: "#34d399",
    loss: "#fb7185",
    accent: "#60a5fa",
    warn: "#fbbf24",
    card: isDark ? "rgba(2, 6, 23, 0.52)" : "rgba(255, 255, 255, 0.84)",
    gridBg: "transparent",
  };
}

function formatSignedR(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function metricToneClass(tone: "blue" | "green" | "amber" | "violet") {
  switch (tone) {
    case "green":
      return "from-emerald-500/20 to-emerald-400/5 border-emerald-400/25";
    case "amber":
      return "from-amber-500/20 to-amber-400/5 border-amber-400/25";
    case "violet":
      return "from-violet-500/20 to-fuchsia-400/5 border-violet-400/25";
    default:
      return "from-sky-500/20 to-blue-400/5 border-sky-400/25";
  }
}

function HeroMetricCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "violet";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border bg-gradient-to-br p-5 shadow-[0_20px_60px_rgba(15,23,42,0.22)]",
        metricToneClass(tone),
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
        {title}
      </div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{detail}</div>
      <div className="mt-4 flex gap-1">
        {[50, 62, 58, 69, 76, 71, 82].map((height, index) => (
          <div
            key={`${title}-${index}`}
            className="w-full rounded-full bg-white/10"
            style={{ height: `${Math.max(18, Math.round(height / 2.5))}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "border-white/10 bg-slate-950/45 text-slate-50 backdrop-blur-sm",
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-white">{title}</div>
            <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
          </div>
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
        </div>
        <div className="mt-5">{children}</div>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "positive" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "warning"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
        : "border-sky-400/20 bg-sky-500/10 text-sky-100";

  return (
    <div className={cn("rounded-2xl border p-4", toneClass)}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-200">{body}</div>
    </div>
  );
}

function ProgressMetric({
  label,
  value,
  suffix = "%",
  toneClass,
  detail,
}: {
  label: string;
  value: number;
  suffix?: string;
  toneClass: string;
  detail: string;
}) {
  const normalized = suffix === "%" ? value : Math.min(100, value * 20);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-medium text-white">
          {value.toFixed(1)}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className={cn("h-2 rounded-full", toneClass)}
          style={{ width: `${Math.max(4, normalized)}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-slate-400">{detail}</div>
    </div>
  );
}

export default function RiskManagementDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const c = useMemo(() => chartPalette(isDark), [isDark]);
  const analysis = useMemo(() => analyzeJournalTrades(DEMO_JOURNAL_TRADES), []);
  const { book, trades, insights, holdBuckets, topWinners, topLosers } = analysis;

  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorInstance, setCalculatorInstance] = useState(0);

  const calculatorInitial = useMemo(
    () => bookStatsToProjectionSnapshot(book),
    [book],
  );

  const openCalculator = () => {
    setCalculatorInstance((value) => value + 1);
    setCalculatorOpen(true);
  };

  const winRateVsReference = book.winRate * 100 - REFERENCE_SCENARIO.winRatePct;
  const rewardRiskVsReference =
    (book.rewardRisk ?? 0) - REFERENCE_SCENARIO.rewardRisk;

  const realizedROption = useMemo(
    () => ({
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontFamily: "Inter, sans-serif", fontSize: 10 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: isDark ? "#0f172a" : "#fff",
        borderColor: c.border,
        textStyle: { color: c.text },
        formatter: (items: Array<{ dataIndex: number }>) => {
          const trade = trades[items[0]?.dataIndex ?? 0];
          return [
            `<strong>${trade.symbol}</strong>`,
            `${trade.holdDays}d hold · ${trade.hasAdd ? "with add" : "single entry"}`,
            `Realized ${formatSignedR(trade.realizedR)}`,
            `Planned risk $${trade.plannedRiskCapital.toFixed(0)}`,
          ].join("<br/>");
        },
      },
      grid: { left: 42, right: 14, top: 8, bottom: 56 },
      xAxis: {
        type: "category",
        data: trades.map((trade) => `${trade.symbol}\n${trade.holdDays}d`),
        axisLabel: { color: c.muted, interval: 0, fontSize: 9 },
        axisLine: { lineStyle: { color: c.border } },
      },
      yAxis: {
        type: "value",
        name: "Realized R",
        axisLabel: {
          color: c.muted,
          formatter: (value: number) => `${value >= 0 ? "+" : ""}${value}`,
        },
        nameTextStyle: { color: c.muted },
        splitLine: { lineStyle: { color: c.border, opacity: 0.3 } },
        axisLine: { show: true, lineStyle: { color: c.border } },
      },
      series: [
        {
          type: "bar",
          data: trades.map((trade) => ({
            value: trade.realizedR,
            itemStyle: {
              color: trade.isWin ? c.win : c.loss,
              borderRadius: trade.realizedR >= 0 ? [8, 8, 0, 0] : [0, 0, 8, 8],
            },
          })),
          barMaxWidth: 28,
          markLine: {
            symbol: "none",
            lineStyle: { color: c.border, width: 1.5 },
            label: { show: false },
            data: [{ yAxis: 0 }],
          },
        },
      ],
    }),
    [c, isDark, trades],
  );

  const holdBucketsOption = useMemo(
    () => ({
      backgroundColor: c.gridBg,
      textStyle: { color: c.text, fontFamily: "Inter, sans-serif", fontSize: 10 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: isDark ? "#0f172a" : "#fff",
        borderColor: c.border,
        textStyle: { color: c.text },
      },
      legend: {
        data: ["Winners", "Losers"],
        bottom: 0,
        textStyle: { color: c.muted },
      },
      grid: { left: 40, right: 16, top: 10, bottom: 48 },
      xAxis: {
        type: "category",
        data: holdBuckets.map((bucket) => bucket.label),
        axisLabel: { color: c.muted },
        axisLine: { lineStyle: { color: c.border } },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: c.muted },
        splitLine: { lineStyle: { color: c.border, opacity: 0.3 } },
        axisLine: { show: true, lineStyle: { color: c.border } },
      },
      series: [
        {
          name: "Winners",
          type: "bar",
          stack: "holds",
          data: holdBuckets.map((bucket) => bucket.winners),
          itemStyle: {
            color: c.win,
            borderRadius: [8, 8, 0, 0],
          },
          barMaxWidth: 36,
        },
        {
          name: "Losers",
          type: "bar",
          stack: "holds",
          data: holdBuckets.map((bucket) => bucket.losers),
          itemStyle: {
            color: c.loss,
            borderRadius: [8, 8, 0, 0],
          },
          barMaxWidth: 36,
        },
      ],
    }),
    [c, holdBuckets, isDark],
  );

  return (
    <PageContainer fullWidth className="mx-auto max-w-[1700px]">
      <ProjectionCalculatorModal
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
        initialSnapshot={calculatorInitial}
        instanceKey={calculatorInstance}
      />

      <div className="rounded-[36px] border border-slate-700/60 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,_#0f172a,_#020617)] p-5 shadow-[0_30px_120px_rgba(2,6,23,0.75)] sm:p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success" className="rounded-full">
                  Journal-derived demo
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/15 text-slate-300">
                  Swing trading
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/15 text-slate-300">
                  {book.n} closed trades
                </Badge>
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Risk dashboard
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Strategy Command Center for swing trades. This demo reads
                journal-style entries, adds, stop raises, partial exits, and
                final sells to assess whether your edge is real and where your
                execution is leaking.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  Sample window: {formatDate(book.sampleStart)} to {formatDate(book.sampleEnd)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  Annualized pace: ~{book.annualizedTradeCount} trades/year
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  No live equity, only realized journal behavior
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" className="rounded-full px-4" onClick={openCalculator}>
                <Calculator className="mr-2 h-4 w-4" />
                Projection calculator
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            The dashboard is intentionally not a mark-to-market equity screen. It is
            a post-trade swing review surface built from entry risk, stop
            discipline, adds, partial exits, hold time, and realized outcome in R.
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            <HeroMetricCard
              title="System health"
              value={`${book.edgeScore.toFixed(0)}/100`}
              detail={`${book.systemStatus}. Score blends expectancy, payoff, and discipline across ${book.n} closed trade${book.n === 1 ? "" : "s"}.`}
              tone="blue"
            />
            <HeroMetricCard
              title="Expectancy / trade"
              value={formatSignedR(book.expectancyRPerTrade)}
              detail={`Profit factor ${book.profitFactor?.toFixed(2) ?? "—"} with ${formatSignedR(book.avgWinR)} average winner.`}
              tone="green"
            />
            <HeroMetricCard
              title="Win rate vs breakeven"
              value={`${(book.winRate * 100).toFixed(1)}%`}
              detail={`Breakeven sits at ${book.breakevenAtBookAvgR != null ? `${(book.breakevenAtBookAvgR * 100).toFixed(1)}%` : "—"}, leaving a ${book.breakevenBufferPct?.toFixed(1) ?? "0.0"} point buffer.`}
              tone="amber"
            />
            <HeroMetricCard
              title="Payoff profile"
              value={`1:${book.rewardRisk?.toFixed(2) ?? "—"}`}
              detail={`Avg winner ${book.avgWinR?.toFixed(2) ?? "—"}R vs avg loser ${book.avgLossRAbs?.toFixed(2) ?? "—"}R.`}
              tone="violet"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <SectionCard
              title="Realized R by closed swing trade"
              subtitle="The featured chart shows actual outcome per journal-derived trade, not live equity fluctuation."
              className="xl:col-span-8"
            >
              <ReactECharts
                option={realizedROption}
                style={{ height: "310px", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </SectionCard>

            <SectionCard
              title="System read"
              subtitle="A single place to interpret the book before drilling into diagnostics."
              className="xl:col-span-4"
            >
              <div className="rounded-3xl border border-emerald-400/15 bg-emerald-500/10 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-300">Current read</div>
                    <div className="text-2xl font-semibold text-white">
                      {book.systemStatus}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-200">
                  {book.expectancyRPerTrade != null && book.expectancyRPerTrade > 0
                    ? "The journal suggests a positive swing edge, but the right-tail still needs more room to develop."
                    : "The book is not generating positive expectancy yet, so process fixes matter more than projections."}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Gross R balance
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    +{book.grossProfitR.toFixed(1)}R / -{book.grossLossRAbs.toFixed(1)}R
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Hold profile
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {book.averageHoldDays?.toFixed(1) ?? "—"}d avg
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Winner hold
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {book.medianWinHoldDays?.toFixed(0) ?? "—"}d median
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Loser hold
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {book.medianLossHoldDays?.toFixed(0) ?? "—"}d median
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Edge overview"
              subtitle="Core swing metrics derived from realized journal outcomes."
              className="xl:col-span-4"
            >
              <div className="space-y-4">
                <ProgressMetric
                  label="Win rate"
                  value={book.winRate * 100}
                  toneClass="bg-gradient-to-r from-sky-500 to-cyan-300"
                  detail="Hit rate only matters in context of payoff and discipline."
                />
                <ProgressMetric
                  label="Payoff ratio"
                  value={book.rewardRisk ?? 0}
                  suffix="R"
                  toneClass="bg-gradient-to-r from-violet-500 to-fuchsia-300"
                  detail="Average winner divided by average loser."
                />
                <ProgressMetric
                  label="Profit factor"
                  value={book.profitFactor ?? 0}
                  suffix="x"
                  toneClass="bg-gradient-to-r from-emerald-500 to-teal-300"
                  detail="Gross profit over gross loss across the sample."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Holding time distribution"
              subtitle="Swing trades should let winners stay alive longer than failed setups."
              className="xl:col-span-4"
            >
              <ReactECharts
                option={holdBucketsOption}
                style={{ height: "230px", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </SectionCard>

            <SectionCard
              title="Execution behaviors"
              subtitle="How often your process shows pyramiding, stop progression, and partial exits."
              className="xl:col-span-4"
            >
              <div className="space-y-4">
                <ProgressMetric
                  label="Trades with adds"
                  value={book.tradesWithAddsPct}
                  toneClass="bg-gradient-to-r from-sky-500 to-blue-300"
                  detail="Higher is only good if add-on trades outperform the base book."
                />
                <ProgressMetric
                  label="Trades with stop raises"
                  value={book.tradesWithStopRaisePct}
                  toneClass="bg-gradient-to-r from-emerald-500 to-green-300"
                  detail="Trailing discipline should increase as swings confirm."
                />
                <ProgressMetric
                  label="Trades with partial exits"
                  value={book.tradesWithPartialExitsPct}
                  toneClass="bg-gradient-to-r from-violet-500 to-fuchsia-300"
                  detail="Partials can reduce emotion, but too much trimming can flatten the right tail."
                />
                <ProgressMetric
                  label="Oversized losses"
                  value={book.oversizedLossPct}
                  toneClass="bg-gradient-to-r from-rose-500 to-red-300"
                  detail="Anything above 0% deserves attention because it breaks the R framework."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Advice from the journal"
              subtitle="Coaching is generated from the computed metrics, not generic copy."
              className="xl:col-span-5"
            >
              <div className="space-y-3">
                {insights.map((insight) => (
                  <InsightCard
                    key={insight.title}
                    title={insight.title}
                    body={insight.body}
                    tone={insight.tone}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Top drivers"
              subtitle="Which trades are carrying the edge and which ones are doing the damage."
              className="xl:col-span-4"
            >
              <div className="space-y-5">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-300">
                    <Trophy className="h-4 w-4" />
                    Best swings
                  </div>
                  <div className="space-y-3">
                    {topWinners.map((trade) => (
                      <div
                        key={trade.id}
                        className="flex items-start justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {trade.symbol}
                          </div>
                          <div className="text-xs text-slate-400">
                            {trade.holdDays}d · {trade.hasAdd ? "with add" : "single entry"}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-emerald-300">
                          {formatSignedR(trade.realizedR)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-rose-300">
                    <TriangleAlert className="h-4 w-4" />
                    Biggest draggers
                  </div>
                  <div className="space-y-3">
                    {topLosers.map((trade) => (
                      <div
                        key={trade.id}
                        className="flex items-start justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {trade.symbol}
                          </div>
                          <div className="text-xs text-slate-400">
                            {trade.holdDays}d · {trade.exceededPlannedRisk ? "exceeded 1R" : "within plan"}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-rose-300">
                          {formatSignedR(trade.realizedR)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Projection scenario"
              subtitle="Monte Carlo should extend your edge review, not replace it."
              className="xl:col-span-3"
            >
              <div className="rounded-3xl border border-blue-400/15 bg-blue-500/10 p-5">
                <div className="flex items-center gap-2 text-sm text-blue-200">
                  <Sparkles className="h-4 w-4" />
                  Scenario seeded from the journal
                </div>
                <div className="mt-3 text-3xl font-semibold text-white">
                  {formatSignedR(book.expectancyRPerTrade)}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">
                  Use your journal-derived win rate, payoff ratio, and trade pace
                  to project what happens if this swing edge persists.
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-200">
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                    <span>Win rate</span>
                    <span>{(book.winRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                    <span>Payoff ratio</span>
                    <span>1:{book.rewardRisk?.toFixed(2) ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                    <span>Trades / year</span>
                    <span>{book.annualizedTradeCount}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-5 w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={openCalculator}
                >
                  Open projection calculator
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </SectionCard>

            <SectionCard
              title="Reference check"
              subtitle={`Reference baseline remains ${REFERENCE_SCENARIO.winRatePct}% win rate and 1:${REFERENCE_SCENARIO.rewardRisk} payoff.`}
              className="xl:col-span-12"
            >
              <div className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Target className="h-4 w-4 text-sky-300" />
                    Win rate gap
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-white">
                    {winRateVsReference >= 0 ? "+" : ""}
                    {winRateVsReference.toFixed(1)} pts
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Journal book vs reference baseline.
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Activity className="h-4 w-4 text-violet-300" />
                    Payoff gap
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-white">
                    {rewardRiskVsReference >= 0 ? "+" : ""}
                    {rewardRiskVsReference.toFixed(2)}R
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Average payoff ratio against the benchmark.
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Flame className="h-4 w-4 text-emerald-300" />
                    Adds delta
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-white">
                    {analysis.averageRWithAdds != null &&
                    analysis.averageRWithoutAdds != null
                      ? `${analysis.averageRWithAdds >= analysis.averageRWithoutAdds ? "+" : ""}${(
                          analysis.averageRWithAdds - analysis.averageRWithoutAdds
                        ).toFixed(2)}R`
                      : "—"}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Average outcome of add-on trades vs single-entry swings.
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Main coaching theme
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">
                    Let the right tail work harder
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Average winners are positive, but too many finish below 1R for a swing system.
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
