import { BarChart3, RefreshCw } from "lucide-react";
import type { MomentumLeadersResponse } from "../api/momentum-leaders.client";
import {
  LEADER_SORT_OPTIONS,
  type LeaderSortKey,
} from "../hooks/use-sorted-leaders";
import {
  LEADER_GROUP_BY_OPTIONS,
  type LeaderGroupBy,
} from "../hooks/use-leader-groups";
import { SELECT_CHEVRON_STYLE } from "./select-chevron-style";

const SELECT_CLASS =
  "appearance-none rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-1 pr-8 text-xs text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer";

function formatScanDate(scanDate: string): string {
  return new Date(`${scanDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface LeadersToolbarProps {
  data: MomentumLeadersResponse | undefined;
  groupBy: LeaderGroupBy;
  onGroupByChange: (groupBy: LeaderGroupBy) => void;
  sortKey: LeaderSortKey;
  onSortChange: (sortKey: LeaderSortKey) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function LeadersToolbar({
  data,
  groupBy,
  onGroupByChange,
  sortKey,
  onSortChange,
  isRefreshing,
  onRefresh,
}: LeadersToolbarProps) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 border-b border-slate-700/50 bg-slate-900/40">
      <div className="flex items-center gap-2 shrink-0">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-sm font-bold text-white">Momentum Leaders</h1>
      </div>

      {data && data.count > 0 && (
        <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums">
          <div className="flex gap-1">
            <dt className="text-slate-500">Leaders</dt>
            <dd className="text-white">
              {data.count}
              <span className="text-slate-500">
                {" "}
                of {data.universeSize.toLocaleString("en-US")}
              </span>
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-slate-500">Consolidating</dt>
            <dd className="text-purple-300">{data.consolidatingCount}</dd>
          </div>
          {data.scanDate && (
            <div className="flex gap-1">
              <dt className="text-slate-500">Scan</dt>
              <dd className="whitespace-nowrap text-slate-300">
                {formatScanDate(data.scanDate)}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <select
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as LeaderGroupBy)}
          aria-label="Group by"
          className={SELECT_CLASS}
          style={SELECT_CHEVRON_STYLE}
        >
          {LEADER_GROUP_BY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as LeaderSortKey)}
          aria-label="Sort by"
          className={SELECT_CLASS}
          style={SELECT_CHEVRON_STYLE}
        >
          {LEADER_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                  bg-slate-800/60 text-slate-300 hover:bg-slate-700/50 hover:text-white
                  border border-slate-600/50 hover:border-slate-500 transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400
                  disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
    </header>
  );
}
