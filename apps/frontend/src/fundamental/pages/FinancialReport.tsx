import { useState, FormEvent } from "react";
import { PageContainer } from "src/global/design-system/page-container";
import { Button } from "src/global/design-system";
import { Input } from "src/global/design-system";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import { useFinancialReport } from "../hooks/use-financial-report";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";

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

export default function FinancialReport() {
  const [symbol, setSymbol] = useState<string>("");
  const [submittedSymbol, setSubmittedSymbol] = useState<string | null>(null);

  const { data, isLoading, error } = useFinancialReport(submittedSymbol);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      setSubmittedSymbol(symbol.trim().toUpperCase());
    }
  };

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Financial Report
              </h1>
              <p className="text-sm text-slate-400">
                View quarterly EPS and revenue growth analysis
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Enter stock symbol (e.g., AAPL)"
              className="flex-1 bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
              maxLength={10}
            />
            <Button
              type="submit"
              disabled={!symbol.trim() || isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? "Loading..." : "Get Report"}
            </Button>
          </form>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
            <LoadingSpinner />
            <p className="mt-4 text-slate-400">Loading financial data...</p>
          </div>
        )}

        {error && (
          <Alert variant="danger">
            <AlertDescription>
              Failed to load financial report. Please check the symbol and try
              again.
            </AlertDescription>
          </Alert>
        )}

        {data && data.report && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-2">
                {data.report.symbol}
              </h2>
              <p className="text-sm text-slate-400">
                Last 8 Quarters - Year-over-Year Growth Analysis
              </p>
            </div>

            <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700 shadow-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Quarter
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      EPS
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      EPS Growth
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Revenue Growth
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {data.report.quarterlyGrowths.map((quarter, index) => (
                    <tr
                      key={`${quarter.quarter}-${quarter.year}`}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {quarter.quarter}
                          </span>
                          <span className="text-sm text-slate-400">
                            {quarter.year}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-white">
                          ${quarter.eps.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div
                          className={`flex items-center justify-end gap-1 ${getGrowthColor(
                            quarter.epsGrowthPercent,
                          )}`}
                        >
                          {quarter.epsGrowthPercent !== null &&
                            (quarter.epsGrowthPercent >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            ))}
                          <span className="text-sm font-semibold">
                            {formatPercent(quarter.epsGrowthPercent)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-white">
                            {formatNumber(quarter.revenue)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div
                          className={`flex items-center justify-end gap-1 ${getGrowthColor(
                            quarter.revenueGrowthPercent,
                          )}`}
                        >
                          {quarter.revenueGrowthPercent !== null &&
                            (quarter.revenueGrowthPercent >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            ))}
                          <span className="text-sm font-semibold">
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

        {!isLoading && !error && !data && submittedSymbol && (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
            <BarChart3 className="w-12 h-12 text-slate-500 mb-4" />
            <p className="text-slate-400">
              Enter a stock symbol to view its financial report
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
