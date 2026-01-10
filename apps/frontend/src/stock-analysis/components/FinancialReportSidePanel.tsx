import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useFinancialReport } from "src/fundamental/hooks/use-financial-report";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";

interface FinancialReportSidePanelProps {
  symbol: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatNumber(num: number): string {
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  }
  if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Math.round(value * 10) / 10}%`;
}

function getGrowthColor(value: number | null): string {
  if (value === null) return "text-slate-400";
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-slate-400";
}

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

export function FinancialReportSidePanel({
  symbol,
  isOpen,
  onClose,
}: FinancialReportSidePanelProps) {
  const symbolToFetch = symbol ? extractSymbol(symbol) : null;
  const { data, isLoading, error } = useFinancialReport(symbolToFetch);

  return (
    <div
      className={`flex-shrink-0 bg-slate-800/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? "w-96 opacity-100" : "w-0 opacity-0 border-0 overflow-hidden"
      }`}
    >
      {isOpen && (
        <>
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white">Financial Report</h2>
              {symbol && (
                <p className="text-xs text-slate-400">{extractSymbol(symbol)}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-w-0">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner />
            <p className="mt-4 text-sm text-slate-400">
              Loading financial data...
            </p>
          </div>
        )}

        {error && (
          <Alert variant="danger">
            <AlertDescription>
              Failed to load financial report. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {data && data.report && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <p className="text-xs text-slate-400">
                Last 8 Quarters - Year-over-Year Growth
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                      Quarter
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      EPS
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      Growth
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      Revenue
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      Growth
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {data.report.quarterlyGrowths.map((quarter) => (
                    <tr
                      key={`${quarter.quarter}-${quarter.year}`}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">
                            {quarter.quarter}
                          </span>
                          <span className="text-xs text-slate-400">
                            {quarter.year}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <span className="text-xs font-medium text-white">
                          ${quarter.eps.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div
                          className={`flex items-center justify-end gap-1 ${getGrowthColor(
                            quarter.epsGrowthPercent,
                          )}`}
                        >
                          {quarter.epsGrowthPercent !== null &&
                            (quarter.epsGrowthPercent >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            ))}
                          <span className="text-xs font-semibold">
                            {formatPercent(quarter.epsGrowthPercent)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-medium text-white">
                            {formatNumber(quarter.revenue)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div
                          className={`flex items-center justify-end gap-1 ${getGrowthColor(
                            quarter.revenueGrowthPercent,
                          )}`}
                        >
                          {quarter.revenueGrowthPercent !== null &&
                            (quarter.revenueGrowthPercent >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            ))}
                          <span className="text-xs font-semibold">
                            {formatPercent(quarter.revenueGrowthPercent)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && !error && !data && symbol && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-slate-400">
              No financial data available for this symbol
            </p>
          </div>
        )}

        {!symbol && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-slate-400">
              Select a symbol to view financial report
            </p>
          </div>
        )}
          </div>
        </>
      )}
    </div>
  );
}
