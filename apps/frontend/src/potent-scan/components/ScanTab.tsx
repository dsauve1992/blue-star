import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  LoadingSpinner,
} from "src/global/design-system";
import type { Cluster, PotentScanHit } from "../api/potent-scan.client";
import { usePotentScanDates } from "../hooks/use-potent-scan-dates";
import { usePotentScan } from "../hooks/use-potent-scan";
import { useClusters } from "../hooks/use-clusters";
import { ScanDateNavigator } from "./ScanDateNavigator";
import {
  ALL_INDUSTRIES,
  ScanHitsFilters,
  type ScanHitsFilterValues,
} from "./ScanHitsFilters";
import { ScanHitsTable } from "./ScanHitsTable";
import { CreateClusterForm } from "./CreateClusterForm";
import { ProposalsPanel } from "./ProposalsPanel";

const INITIAL_FILTERS: ScanHitsFilterValues = {
  tier: "all",
  industry: ALL_INDUSTRIES,
  cluster: "all",
};

function activeClustersByTicker(clusters: Cluster[]) {
  const clustersByTicker = new Map<string, Cluster[]>();
  for (const cluster of clusters) {
    for (const member of cluster.members) {
      if (member.removedAt !== null) continue;
      clustersByTicker.set(member.ticker, [
        ...(clustersByTicker.get(member.ticker) ?? []),
        cluster,
      ]);
    }
  }
  return clustersByTicker;
}

function matchesFilters(
  hit: PotentScanHit,
  filters: ScanHitsFilterValues,
  clustersByTicker: Map<string, Cluster[]>,
) {
  const inCluster = clustersByTicker.has(hit.symbol);
  return (
    (filters.tier === "all" || hit.tier === filters.tier) &&
    (filters.industry === ALL_INDUSTRIES ||
      hit.industry === filters.industry) &&
    (filters.cluster === "all" ||
      (filters.cluster === "in" ? inCluster : !inCluster))
  );
}

export function ScanTab() {
  const scanDates = usePotentScanDates();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const latestScanDate = scanDates.data?.[0];
  if (selectedDate === null && latestScanDate) {
    setSelectedDate(latestScanDate);
  }
  const scanDate = selectedDate ?? latestScanDate;
  const scan = usePotentScan(scanDate);
  const clusters = useClusters("tracking");

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const clustersByTicker = useMemo(
    () => activeClustersByTicker(clusters.data ?? []),
    [clusters.data],
  );

  const hits = useMemo(() => scan.data?.hits ?? [], [scan.data]);
  const industries = useMemo(
    () => [...new Set(hits.map((hit) => hit.industry))].sort(),
    [hits],
  );
  const visibleHits = useMemo(
    () => hits.filter((hit) => matchesFilters(hit, filters, clustersByTicker)),
    [hits, filters, clustersByTicker],
  );
  const selectedTickers = visibleHits
    .map((hit) => hit.symbol)
    .filter((symbol) => selected.has(symbol));

  const resetSelection = () => {
    setSelected(new Set());
    setIsCreating(false);
  };

  const handleScanDateChange = (date: string) => {
    setSelectedDate(date);
    setFilters((previous) => ({ ...previous, industry: ALL_INDUSTRIES }));
    resetSelection();
  };

  const toggle = (symbol: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });

  const toggleAll = () =>
    setSelected(
      selectedTickers.length === visibleHits.length
        ? new Set()
        : new Set(visibleHits.map((hit) => hit.symbol)),
    );

  if (scanDates.isLoading) {
    return <LoadingSpinner label="Loading scans..." />;
  }

  if (scanDates.error) {
    return (
      <Alert variant="danger">
        <AlertDescription>
          Couldn't load scans: {scanDates.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!scanDate) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        No potent scan stored yet. The scan runs on weekdays after the close.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ScanDateNavigator
          scanDates={scanDates.data ?? []}
          scanDate={scanDate}
          onScanDateChange={handleScanDateChange}
        />
        {scan.data && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {scan.data.hits.length} hits of{" "}
            {scan.data.universeSize.toLocaleString("en-US")} stocks
          </p>
        )}
      </div>

      {scan.data && (
        <ProposalsPanel
          key={scanDate}
          scanDate={scanDate}
          hits={hits}
          trackedClusters={clusters.data ?? []}
        />
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
          <ScanHitsFilters
            values={filters}
            industries={industries}
            onChange={setFilters}
          />
          <Button
            size="sm"
            disabled={selectedTickers.length === 0}
            onClick={() => setIsCreating(true)}
          >
            Create cluster
            {selectedTickers.length > 0 && ` (${selectedTickers.length})`}
          </Button>
        </div>

        {isCreating && selectedTickers.length > 0 && (
          <CreateClusterForm
            tickers={selectedTickers}
            sourceScanDate={scanDate}
            onCreated={resetSelection}
            onCancel={() => setIsCreating(false)}
          />
        )}

        {clusters.error && (
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <Alert variant="warning">
              <AlertDescription>
                Couldn't load cluster membership: {clusters.error.message}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {scan.isLoading ? (
          <div className="p-6">
            <LoadingSpinner label="Loading scan..." />
          </div>
        ) : scan.error ? (
          <div className="p-4">
            <Alert variant="danger">
              <AlertDescription>
                Couldn't load the {scanDate} scan: {scan.error.message}
              </AlertDescription>
            </Alert>
          </div>
        ) : visibleHits.length === 0 ? (
          <p className="p-6 text-sm text-slate-600 dark:text-slate-400">
            {hits.length === 0
              ? "This scan has no hits."
              : "No hits match these filters."}
          </p>
        ) : (
          <ScanHitsTable
            hits={visibleHits}
            clustersByTicker={clustersByTicker}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        )}
      </Card>
    </div>
  );
}
