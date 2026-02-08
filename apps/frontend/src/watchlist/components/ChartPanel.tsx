import { useState } from "react";
import { ChevronDown, BarChart3 } from "lucide-react";
import TradingViewTapeCardWidget from "src/stock-analysis/components/new/TradingViewTapeCardWidget";
import { FinancialReportChartFooter } from "src/stock-analysis/components/FinancialReportChartFooter";
import type { FinancialReportApiDto } from "src/fundamental/api/fundamental.client";
import type { Watchlist } from "../api/watchlist.client";

interface ChartPanelProps {
  selectedTicker: string | null;
  selectedWatchlist: Watchlist | undefined;
  tradingViewProps: {
    exchange: string;
    symbol: string;
    interval: "D" | "15" | "60" | "W";
    range: "1m" | "3m" | "6m" | "12m" | "5d" | "1d" | "3Y" | "60m";
  } | null;
  movingAverages: { type: "EMA" | "SMA"; length: number }[];
  financialData: { report: FinancialReportApiDto } | undefined;
  financialLoading: boolean;
  financialError: Error | null;
}

export function ChartPanel({
  selectedTicker,
  selectedWatchlist,
  tradingViewProps,
  movingAverages,
  financialData,
  financialLoading,
  financialError,
}: ChartPanelProps) {
  const [showFinancialFooter, setShowFinancialFooter] = useState(true);

  return (
    <main className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col min-h-0 p-4 gap-2 overflow-hidden">
        <div className="flex-1 min-h-0">
          {selectedTicker && tradingViewProps ? (
            <div className="h-full rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl shadow-2xl">
              <TradingViewTapeCardWidget
                exchange={tradingViewProps.exchange}
                symbol={tradingViewProps.symbol}
                interval={tradingViewProps.interval}
                range={tradingViewProps.range}
                movingAverages={movingAverages}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center rounded-xl border border-slate-700/50 border-dashed bg-slate-800/20">
              <div className="p-6 rounded-full bg-slate-700/30 mb-6">
                <BarChart3 className="w-16 h-16 text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                No Ticker Selected
              </h3>
              <p className="text-slate-500 text-center max-w-md">
                {selectedWatchlist
                  ? "Select a ticker from the list on the left."
                  : "Select a watchlist from the cards above."}
              </p>
            </div>
          )}
        </div>

        {/* Collapsible Financial Footer */}
        {selectedTicker && (
          <div className="flex-shrink-0">
            <button
              onClick={() => setShowFinancialFooter(!showFinancialFooter)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150 group"
              aria-expanded={showFinancialFooter}
              aria-label={
                showFinancialFooter
                  ? "Hide financial data"
                  : "Show financial data"
              }
            >
              <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                {showFinancialFooter ? "Hide" : "Show"} Financials
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
                  showFinancialFooter ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                showFinancialFooter
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <FinancialReportChartFooter
                report={financialData?.report ?? null}
                isLoading={financialLoading}
                error={financialError}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
