import { Link } from "react-router";
import { Badge } from "src/global/design-system";
import type { Cluster, PotentScanHit } from "../api/potent-scan.client";
import { TierBadge } from "./TierBadge";

interface ScanHitsTableProps {
  hits: PotentScanHit[];
  clustersByTicker: Map<string, Cluster[]>;
  selected: Set<string>;
  onToggle: (symbol: string) => void;
  onToggleAll: () => void;
}

const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;

const formatRelativeVolume = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}×`;

const formatMarketCap = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
        style: "currency",
        currency: "USD",
      }).format(value);

const HEADER_CLASS =
  "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

export function ScanHitsTable({
  hits,
  clustersByTicker,
  selected,
  onToggle,
  onToggleAll,
}: ScanHitsTableProps) {
  const allSelected =
    hits.length > 0 && hits.every((hit) => selected.has(hit.symbol));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-slate-900 dark:text-slate-100">
        <thead className="bg-slate-50 dark:bg-slate-900/40">
          <tr>
            <th className="w-8 py-2 pl-4 pr-1">
              <input
                type="checkbox"
                aria-label="Select all hits"
                checked={allSelected}
                onChange={onToggleAll}
              />
            </th>
            <th className={`${HEADER_CLASS} text-left`}>Ticker</th>
            <th className={`${HEADER_CLASS} text-right`}>% Chg</th>
            <th className={`${HEADER_CLASS} text-left`}>Tier</th>
            <th className={`${HEADER_CLASS} text-right`}>ADR %</th>
            <th className={`${HEADER_CLASS} text-right`}>Mkt cap</th>
            <th className={`${HEADER_CLASS} text-right`}>Rel vol</th>
            <th className={`${HEADER_CLASS} text-left`}>Industry</th>
            <th className={`${HEADER_CLASS} text-left`}>Clusters</th>
          </tr>
        </thead>
        <tbody>
          {hits.map((hit) => {
            const clusters = clustersByTicker.get(hit.symbol) ?? [];
            return (
              <tr
                key={hit.symbol}
                className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <td className="py-2 pl-4 pr-1">
                  <input
                    type="checkbox"
                    aria-label={`Select ${hit.symbol}`}
                    checked={selected.has(hit.symbol)}
                    onChange={() => onToggle(hit.symbol)}
                  />
                </td>
                <td className="px-3 py-2 font-mono font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    {hit.symbol}
                    {hit.isMomentumLeader && (
                      <Badge variant="default" title="Current Momentum Leader">
                        ★ML
                      </Badge>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-success-700 dark:text-success-400">
                  +{hit.changePct.toFixed(1)}%
                </td>
                <td className="px-3 py-2">
                  <TierBadge tier={hit.tier} />
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatPercent(hit.adrPct)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatMarketCap(hit.marketCap)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatRelativeVolume(hit.relativeVolume)}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  {hit.industry}
                </td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1">
                    {clusters.map((cluster) => (
                      <Link
                        key={cluster.id}
                        to={`/potent-scan/clusters/${cluster.id}`}
                      >
                        <Badge
                          variant="outline"
                          title={cluster.name}
                          className="max-w-48 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <span className="truncate">{cluster.name}</span>
                        </Badge>
                      </Link>
                    ))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
