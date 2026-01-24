import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import type { FinancialReportApiDto } from "src/fundamental/api/fundamental.client";

interface FinancialReportChartFooterProps {
  report: FinancialReportApiDto | null;
  isLoading: boolean;
  error: Error | null;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
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

function formatQuarterLabel(quarter: string, year: string): string {
  const shortYear = year.length >= 2 ? year.slice(-2) : year;
  return `${quarter} '${shortYear}`;
}

export function FinancialReportChartFooter({
  report,
  isLoading,
  error,
}: FinancialReportChartFooterProps) {
  if (isLoading) {
    return (
      <div className="flex-shrink-0 flex items-center justify-center gap-2 py-4 border-t border-slate-700/50">
        <LoadingSpinner />
        <span className="text-xs text-slate-400">Loading financial data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-shrink-0 border-t border-slate-700/50 p-4">
        <Alert variant="danger">
          <AlertDescription>
            Failed to load financial report. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!report || !report.quarterlyGrowths.length) {
    return null;
  }

  const quarters = report.quarterlyGrowths;

  return (
    <div className="flex-shrink-0 border-t border-slate-700/50 pt-4 mt-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
        Last {quarters.length} Quarters · YoY Growth
      </p>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase w-16" />
              {quarters.map((q) => (
                <th
                  key={`${q.quarter}-${q.year}`}
                  className="px-2 py-1.5 text-center text-[10px] font-semibold text-slate-400 uppercase min-w-[72px]"
                >
                  {formatQuarterLabel(q.quarter, q.year)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/70">
            <tr className="hover:bg-slate-700/20 transition-colors">
              <td className="px-2 py-1.5 text-xs font-medium text-slate-400 align-top">
                EPS
              </td>
              {quarters.map((q) => (
                <td
                  key={`eps-${q.quarter}-${q.year}`}
                  className="px-2 py-1.5 text-center align-top"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div
                      className={`flex items-center justify-center gap-0.5 ${getGrowthColor(q.epsGrowthPercent)}`}
                    >
                      {q.epsGrowthPercent !== null &&
                        (q.epsGrowthPercent >= 0 ? (
                          <TrendingUp className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <TrendingDown className="w-3 h-3 flex-shrink-0" />
                        ))}
                      <span className="text-xs font-semibold">
                        {formatPercent(q.epsGrowthPercent)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      ${q.eps.toFixed(2)}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-700/20 transition-colors">
              <td className="px-2 py-1.5 text-xs font-medium text-slate-400 align-top">
                Revenue
              </td>
              {quarters.map((q) => (
                <td
                  key={`rev-${q.quarter}-${q.year}`}
                  className="px-2 py-1.5 text-center align-top"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div
                      className={`flex items-center justify-center gap-0.5 ${getGrowthColor(q.revenueGrowthPercent)}`}
                    >
                      {q.revenueGrowthPercent !== null &&
                        (q.revenueGrowthPercent >= 0 ? (
                          <TrendingUp className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <TrendingDown className="w-3 h-3 flex-shrink-0" />
                        ))}
                      <span className="text-xs font-semibold">
                        {formatPercent(q.revenueGrowthPercent)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5">
                      <DollarSign className="w-2.5 h-2.5" />
                      {formatNumber(q.revenue)}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
