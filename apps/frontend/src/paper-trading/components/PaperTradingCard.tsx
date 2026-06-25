import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../global/design-system";
import {
  formatCurrency,
  getChangeColor,
} from "../../global/design-system/utils";
import {
  usePaperTradingStats,
  usePaperTrades,
} from "../hooks/use-paper-trading";
import type {
  PaperTrade,
  PaperTradeQuadrant,
} from "../api/paper-trading.types";

const QUADRANT_VARIANT: Record<
  PaperTradeQuadrant,
  "success" | "danger" | "warning" | "secondary"
> = {
  Leading: "success",
  Improving: "warning",
  Weakening: "secondary",
  Lagging: "danger",
};

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={
          valueClassName ??
          "font-mono text-lg font-semibold text-slate-900 dark:text-slate-50"
        }
      >
        {value}
      </p>
    </div>
  );
}

function RecentTradeRow({ trade }: { trade: PaperTrade }) {
  const isClosed = trade.status === "CLOSED";
  const rText =
    trade.realizedR !== null ? `${trade.realizedR.toFixed(2)}R` : "open";

  const { context } = trade;
  const hasRsContext =
    context.globalRsRating !== null || context.industryGroupRsRating !== null;
  const hasContext =
    context.industryGroup !== null ||
    context.industryGroupQuadrant !== null ||
    hasRsContext;

  return (
    <div className="space-y-1 py-1.5 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-slate-50">
            {trade.ticker}
          </span>
          {!isClosed && (
            <Badge variant="secondary" className="text-[10px]">
              OPEN
            </Badge>
          )}
          {context.industryGroupQuadrant !== null && (
            <Badge
              variant={QUADRANT_VARIANT[context.industryGroupQuadrant]}
              className="text-[10px]"
            >
              {context.industryGroupQuadrant}
            </Badge>
          )}
        </div>
        <span
          className={`font-mono ${
            trade.realizedR === null
              ? "text-slate-400 dark:text-slate-500"
              : getChangeColor(trade.realizedR)
          }`}
        >
          {rText}
        </span>
      </div>
      {hasContext && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {context.industryGroup !== null && (
            <span className="truncate">{context.industryGroup}</span>
          )}
          {hasRsContext && (
            <span className="ml-auto shrink-0 font-mono">
              RS{" "}
              {context.globalRsRating !== null ? context.globalRsRating : "—"}
              {" / "}
              {context.industryGroupRsRating !== null
                ? context.industryGroupRsRating
                : "—"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function PaperTradingCard() {
  const { data: stats, isLoading, isError } = usePaperTradingStats();
  const { data: trades } = usePaperTrades();

  const recentTrades = (trades ?? []).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Paper Trading</CardTitle>
          {stats && (
            <Badge variant={stats.totalPnl >= 0 ? "success" : "danger"}>
              {stats.totalPnl >= 0 ? "+" : ""}
              {formatCurrency(stats.totalPnl)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ) : isError || !stats ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Couldn’t load paper trading results.
          </p>
        ) : stats.closedCount === 0 && stats.openCount === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No simulated trades yet. Gap signals open paper positions
            automatically.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span
                className={`font-mono text-3xl font-bold ${getChangeColor(
                  stats.currentEquity - stats.startingEquity,
                )}`}
              >
                {formatCurrency(stats.currentEquity)}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                equity
              </span>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                from {formatCurrency(stats.startingEquity)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="Win rate"
                value={
                  stats.closedCount > 0
                    ? `${(stats.winRate * 100).toFixed(0)}%`
                    : "—"
                }
              />
              <Stat
                label="Avg R"
                value={
                  stats.closedCount > 0 ? `${stats.averageR.toFixed(2)}R` : "—"
                }
                valueClassName={`font-mono text-lg font-semibold ${getChangeColor(
                  stats.averageR,
                )}`}
              />
              <Stat
                label="Trades"
                value={`${stats.closedCount} / ${stats.openCount} open`}
              />
            </div>

            {recentTrades.length > 0 && (
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                  Recent
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentTrades.map((trade) => (
                    <RecentTradeRow key={trade.id} trade={trade} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
