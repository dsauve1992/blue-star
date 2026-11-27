import type { Tier } from "../api/potent-scan.client";

export type TierFilter = "all" | Tier;
export type ClusterFilter = "all" | "in" | "out";

export interface ScanHitsFilterValues {
  tier: TierFilter;
  industry: string;
  cluster: ClusterFilter;
}

export const ALL_INDUSTRIES = "all";

const TIER_OPTIONS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All tiers" },
  { value: "Lead", label: "Lead" },
  { value: "Mediocre", label: "Mediocre" },
  { value: "Lag", label: "Lag" },
];

const CLUSTER_OPTIONS: { value: ClusterFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "in", label: "In a cluster" },
  { value: "out", label: "Not in a cluster" },
];

const SELECT_CLASS =
  "h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

const LABEL_CLASS =
  "flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400";

interface ScanHitsFiltersProps {
  values: ScanHitsFilterValues;
  industries: string[];
  onChange: (values: ScanHitsFilterValues) => void;
}

export function ScanHitsFilters({
  values,
  industries,
  onChange,
}: ScanHitsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className={LABEL_CLASS}>
        Tier
        <select
          value={values.tier}
          onChange={(e) =>
            onChange({ ...values, tier: e.target.value as TierFilter })
          }
          className={SELECT_CLASS}
        >
          {TIER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASS}>
        Industry
        <select
          value={values.industry}
          onChange={(e) => onChange({ ...values, industry: e.target.value })}
          className={SELECT_CLASS}
        >
          <option value={ALL_INDUSTRIES}>All industries</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASS}>
        Cluster
        <select
          value={values.cluster}
          onChange={(e) =>
            onChange({ ...values, cluster: e.target.value as ClusterFilter })
          }
          className={SELECT_CLASS}
        >
          {CLUSTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
