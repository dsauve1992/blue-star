import { Badge, Card, CardContent, CardHeader, CardTitle, Separator } from "../../global/design-system";
import { getChangeColor } from "../../global/design-system/utils";
import { TradeDailyChart } from "./TradeDailyChart";
import { TradeIntradayChart } from "./TradeIntradayChart";
import { isIntradayAvailable } from "../utils/trade-window";
import type { PaperTrade, PaperTradeQuadrant } from "../api/paper-trading.types";

interface TradeDetailProps {
  trade: PaperTrade;
}

const QUADRANT_VARIANT: Record<
  PaperTradeQuadrant,
  "success" | "danger" | "warning" | "secondary"
> = {
  Leading: "success",
  Improving: "warning",
  Weakening: "secondary",
  Lagging: "danger",
};

function Fact({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={
          valueClassName ?? "font-mono text-sm font-semibold text-slate-900 dark:text-slate-50"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function TradeDetail({ trade }: TradeDetailProps) {
  const { context } = trade;
  const isClosed = trade.status === "CLOSED";
  const rText = trade.realizedR !== null ? `${trade.realizedR.toFixed(2)}R` : "open";
  const pnlText =
    trade.pnl === null ? "—" : `${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`;

  const hasRsContext =
    context.globalRsRating !== null || context.industryGroupRsRating !== null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{trade.ticker}</CardTitle>
            <Badge variant={isClosed ? "secondary" : "warning"}>{trade.status}</Badge>
            {context.industryGroupQuadrant !== null && (
              <Badge variant={QUADRANT_VARIANT[context.industryGroupQuadrant]}>
                {context.industryGroupQuadrant}
              </Badge>
            )}
            {trade.exitReason !== null && (
              <Badge variant="outline">{trade.exitReason}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact label="Entry" value={`$${trade.entryPrice.toFixed(2)}`} />
            <Fact label="Stop" value={`$${trade.stopPrice.toFixed(2)}`} />
            <Fact label="Target" value={`$${trade.targetPrice.toFixed(2)}`} />
            <Fact
              label="Exit"
              value={trade.exitPrice !== null ? `$${trade.exitPrice.toFixed(2)}` : "—"}
            />
            <Fact label="Shares" value={trade.shares.toString()} />
            <Fact label="Risk/share" value={`$${trade.riskPerShare.toFixed(2)}`} />
            <Fact
              label="R"
              value={rText}
              valueClassName={`font-mono text-sm font-semibold ${
                trade.realizedR === null
                  ? "text-slate-400 dark:text-slate-500"
                  : getChangeColor(trade.realizedR)
              }`}
            />
            <Fact
              label="P&L"
              value={pnlText}
              valueClassName={`font-mono text-sm font-semibold ${
                trade.pnl === null ? "text-slate-400 dark:text-slate-500" : getChangeColor(trade.pnl)
              }`}
            />
          </div>

          {(context.industryGroup !== null || hasRsContext) && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                {context.industryGroup !== null && (
                  <span>{context.industryGroup}</span>
                )}
                {hasRsContext && (
                  <span className="font-mono">
                    RS {context.globalRsRating ?? "—"} / {context.industryGroupRsRating ?? "—"}
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Daily — entry, stop &amp; target
        </h3>
        <TradeDailyChart trade={trade} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          5-minute — entry
        </h3>
        {isIntradayAvailable(trade.openedAt) ? (
          <TradeIntradayChart trade={trade} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Intraday (5-min) history is only available for ~60 days; this trade is older.
          </p>
        )}
      </div>
    </div>
  );
}
