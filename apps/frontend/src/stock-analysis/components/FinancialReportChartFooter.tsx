import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import type {
  AnnualGrowthApiDto,
  FinancialReportApiDto,
  QuarterlyGrowthApiDto,
} from "src/fundamental/api/fundamental.client";

interface FinancialReportChartFooterProps {
  report: FinancialReportApiDto | null;
  isLoading: boolean;
  error: Error | null;
}

function formatNumber(num: number | null): string {
  if (num === null) return "—";
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

const ANNUAL_EPS_GROWTH_TARGET_PERCENT = 25;
const RETURN_ON_EQUITY_TARGET_PERCENT = 17;

function getThresholdColor(value: number | null, target: number): string {
  if (value === null) return "text-slate-400";
  if (value >= target) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-amber-400";
}

function formatEps(eps: number): string {
  return `${eps < 0 ? "-" : ""}$${Math.abs(eps).toFixed(2)}`;
}

function formatRatio(value: number | null): string {
  if (value === null) return "N/A";
  return `${Math.round(value * 10) / 10}%`;
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
        <span className="text-xs text-slate-400">
          Loading financial data...
        </span>
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

  if (!report) {
    return null;
  }

  return (
    <div className="flex-shrink-0 border-t border-slate-700/50 pt-3 mt-3 flex flex-wrap items-start gap-x-10 gap-y-3 overflow-x-auto">
      {report.quarterlyGrowths.length ? (
        <QuarterlyGrowthTable quarters={report.quarterlyGrowths} />
      ) : (
        <p className="text-xs text-slate-400 py-1">
          No quarterly filings on SEC EDGAR (e.g. foreign issuers filing 20-F)
        </p>
      )}
      {report.annualGrowths.length > 0 && (
        <AnnualGrowthTable years={report.annualGrowths} />
      )}
    </div>
  );
}

const COLLAPSED_QUARTER_COUNT = 4;

function QuarterlyGrowthTable({
  quarters,
}: {
  quarters: QuarterlyGrowthApiDto[];
}) {
  const [showAll, setShowAll] = useState(false);
  const hiddenCount = quarters.length - COLLAPSED_QUARTER_COUNT;
  const visible = showAll
    ? quarters
    : quarters.slice(0, COLLAPSED_QUARTER_COUNT);

  return (
    <GrowthTable
      caption="Quarterly · YoY"
      columns={visible.map((q) => ({
        key: `${q.quarter}-${q.year}`,
        label: formatQuarterLabel(q.quarter, q.year),
      }))}
      rows={[
        {
          label: "EPS",
          cells: visible.map((q) => ({
            growth: q.epsGrowthPercent,
            growthClassName: getGrowthColor(q.epsGrowthPercent),
            value: formatEps(q.eps),
          })),
        },
        {
          label: "Revenue",
          cells: visible.map((q) => ({
            growth: q.revenueGrowthPercent,
            growthClassName: getGrowthColor(q.revenueGrowthPercent),
            value: formatNumber(q.revenue),
          })),
        },
      ]}
      headerAction={
        hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
            aria-label={
              showAll
                ? `Show latest ${COLLAPSED_QUARTER_COUNT} quarters`
                : `Show all ${quarters.length} quarters`
            }
            className="inline-flex items-center gap-0.5 rounded px-1.5 -my-0.5 text-[10px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
          >
            {showAll ? "Less" : `+${hiddenCount}`}
            <ChevronRight
              className={`w-3 h-3 transition-transform duration-200 ease-out ${showAll ? "rotate-180" : ""}`}
            />
          </button>
        )
      }
    />
  );
}

function AnnualGrowthTable({ years }: { years: AnnualGrowthApiDto[] }) {
  return (
    <GrowthTable
      caption="Annual"
      columns={years.map((y) => ({
        key: y.year,
        label: `FY '${y.year.slice(-2)}`,
      }))}
      rows={[
        {
          label: "EPS",
          cells: years.map((y) => ({
            growth: y.epsGrowthPercent,
            growthClassName: getThresholdColor(
              y.epsGrowthPercent,
              ANNUAL_EPS_GROWTH_TARGET_PERCENT,
            ),
            value: formatEps(y.eps),
          })),
        },
        {
          label: "ROE",
          cells: years.map((y) => ({
            growth: y.returnOnEquityPercent,
            growthClassName: getThresholdColor(
              y.returnOnEquityPercent,
              RETURN_ON_EQUITY_TARGET_PERCENT,
            ),
            unsigned: true,
          })),
        },
      ]}
    />
  );
}

interface GrowthCell {
  growth: number | null;
  growthClassName: string;
  value?: string;
  unsigned?: boolean;
}

function GrowthTable({
  caption,
  columns,
  rows,
  headerAction,
}: {
  caption: string;
  columns: { key: string; label: string }[];
  rows: { label: string; cells: GrowthCell[] }[];
  headerAction?: ReactNode;
}) {
  return (
    <div
      className="min-w-max"
      style={{ flexGrow: columns.length + 1, flexBasis: 0 }}
    >
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="pr-3 py-1 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              {caption}
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-2 py-1 text-right text-[10px] font-semibold text-slate-400 uppercase whitespace-nowrap"
              >
                {column.label}
              </th>
            ))}
            {headerAction && <th className="pl-1 py-1">{headerAction}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/70">
          {rows.map((row) => (
            <tr key={row.label} className="hover:bg-slate-700/20">
              <th
                scope="row"
                className="pr-3 py-1 text-left font-medium text-slate-400 whitespace-nowrap"
              >
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td
                  key={columns[index].key}
                  className="px-2 py-1 text-right whitespace-nowrap"
                >
                  <span className={`font-semibold ${cell.growthClassName}`}>
                    {cell.unsigned
                      ? formatRatio(cell.growth)
                      : formatPercent(cell.growth)}
                  </span>
                  {cell.value && (
                    <span className="ml-1.5 text-[10px] text-slate-500">
                      {cell.value}
                    </span>
                  )}
                </td>
              ))}
              {headerAction && <td />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
