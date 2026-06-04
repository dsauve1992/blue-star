import type { ExposureBand, RegimeState } from '../api/market-regime.types';

interface ExposureBandCardProps {
  band: ExposureBand;
  state: RegimeState;
}

const stateHeaderClassMap: Record<RegimeState, string> = {
  GREEN: 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-200',
  YELLOW: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200',
  RED: 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200',
};

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </span>
    </div>
  );
}

export function ExposureBandCard({ band, state }: ExposureBandCardProps) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div
        className={`px-4 py-2 text-sm font-semibold ${stateHeaderClassMap[state]}`}
      >
        Suggested Exposure Band
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            label="Per-trade risk"
            value={`${band.perTradeRiskPct}%`}
          />
          <Metric
            label="Max portfolio heat"
            value={`${band.maxPortfolioHeatPct}%`}
          />
          <Metric
            label="Max sector heat"
            value={`${band.maxSectorHeatPct}%`}
          />
          <Metric label="Max positions" value={`${band.maxPositions}`} />
        </div>
        {band.posture && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {band.posture}
          </p>
        )}
        <p className="text-xs italic text-slate-400 dark:text-slate-500">
          Guidance only — not auto-applied to sizing.
        </p>
      </div>
    </div>
  );
}
