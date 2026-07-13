import { useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  LoadingSpinner,
  MetricCard,
  PageContainer,
} from "../../global/design-system";
import { usePaperTradingStats, usePaperTrades } from "../hooks/use-paper-trading";
import { TradeList } from "../components/TradeList";
import { TradeDetail } from "../components/TradeDetail";

export default function PaperTradingPage() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = usePaperTradingStats();
  const { data: trades, isLoading: tradesLoading, isError: tradesError } = usePaperTrades();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId !== null || !trades || trades.length === 0) return;

    const newestTrade = [...trades].sort(
      (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
    )[0];
    setSelectedId(newestTrade.id);
  }, [trades, selectedId]);

  const isLoading = statsLoading || tradesLoading;
  const isError = statsError || tradesError;
  const selectedTrade = trades?.find((trade) => trade.id === selectedId) ?? null;

  return (
    <PageContainer>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-50">
        Paper Trading
      </h1>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner label="Loading paper trading data..." />
        </div>
      ) : isError || !stats || !trades ? (
        <Alert variant="danger">
          <AlertDescription>Couldn’t load paper trading data.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard title="Equity" value={stats.currentEquity} changeType="currency" />
            <MetricCard
              title="Total P&L"
              value={stats.totalPnl}
              changeType="currency"
              description={stats.totalPnl >= 0 ? "profit" : "loss"}
            />
            <MetricCard
              title="Win rate"
              value={stats.closedCount > 0 ? `${(stats.winRate * 100).toFixed(0)}%` : "—"}
            />
            <MetricCard
              title="Avg R"
              value={stats.closedCount > 0 ? `${stats.averageR.toFixed(2)}R` : "—"}
            />
            <MetricCard title="Open" value={stats.openCount.toString()} />
            <MetricCard title="Closed" value={stats.closedCount.toString()} />
          </div>

          {trades.length === 0 ? (
            <Alert>
              <AlertDescription>
                No simulated trades yet. Gap signals open paper positions automatically.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
              <TradeList
                trades={trades}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              {selectedTrade ? (
                <TradeDetail trade={selectedTrade} />
              ) : (
                <Alert>
                  <AlertDescription>Select a trade to see details.</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
