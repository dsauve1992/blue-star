import { Alert, AlertDescription, Badge } from "../../global/design-system";
import { cn, getChangeColor } from "../../global/design-system/utils";
import type { PaperTrade } from "../api/paper-trading.types";

interface TradeListProps {
  trades: PaperTrade[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function statusBadgeVariant(trade: PaperTrade): "warning" | "success" | "danger" | "secondary" {
  if (trade.status === "OPEN") return "warning";
  if (trade.pnl === null) return "secondary";
  return trade.pnl >= 0 ? "success" : "danger";
}

function formatPrice(value: number | null): string {
  return value === null ? "—" : `$${value.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TradeList({ trades, selectedId, onSelect }: TradeListProps) {
  if (trades.length === 0) {
    return (
      <Alert>
        <AlertDescription>No paper trades yet.</AlertDescription>
      </Alert>
    );
  }

  const sortedTrades = [...trades].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Ticker</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Entry</th>
            <th className="px-3 py-2 font-medium">Stop</th>
            <th className="px-3 py-2 font-medium">Target</th>
            <th className="px-3 py-2 font-medium">Exit</th>
            <th className="px-3 py-2 font-medium">R</th>
            <th className="px-3 py-2 font-medium">P&amp;L</th>
            <th className="px-3 py-2 font-medium">Opened</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedTrades.map((trade) => {
            const isSelected = trade.id === selectedId;
            const rText = trade.realizedR !== null ? `${trade.realizedR.toFixed(2)}R` : "open";

            return (
              <tr
                key={trade.id}
                onClick={() => onSelect(trade.id)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
                  isSelected && "bg-primary-50 dark:bg-primary-900/20",
                )}
              >
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                  {trade.ticker}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={statusBadgeVariant(trade)} className="text-[10px]">
                    {trade.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono">{formatPrice(trade.entryPrice)}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(trade.stopPrice)}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(trade.targetPrice)}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(trade.exitPrice)}</td>
                <td
                  className={cn(
                    "px-3 py-2 font-mono",
                    trade.realizedR === null
                      ? "text-slate-400 dark:text-slate-500"
                      : getChangeColor(trade.realizedR),
                  )}
                >
                  {rText}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 font-mono",
                    trade.pnl === null
                      ? "text-slate-400 dark:text-slate-500"
                      : getChangeColor(trade.pnl),
                  )}
                >
                  {trade.pnl === null ? "—" : `${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`}
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                  {formatDate(trade.openedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
