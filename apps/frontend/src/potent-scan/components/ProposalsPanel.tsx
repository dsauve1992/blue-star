import { useMemo } from "react";
import {
  Alert,
  AlertDescription,
  LoadingSpinner,
} from "src/global/design-system";
import type {
  Cluster,
  NewClusterProposal,
  PotentScanHit,
  Tier,
} from "../api/potent-scan.client";
import { useScanProposals } from "../hooks/use-scan-proposals";
import { AdditionProposalRow } from "./AdditionProposalRow";
import {
  NewClusterProposalCard,
  type MergeOverlap,
} from "./NewClusterProposalCard";
import type { CreatedClusterLink } from "./ProposalDecision";

interface ProposalsPanelProps {
  scanDate: string;
  hits: PotentScanHit[];
  trackedClusters: Cluster[];
}

const SECTION_TITLE_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

function createdClustersOf(
  proposal: NewClusterProposal,
  clusterNameById: Map<string, string>,
): CreatedClusterLink[] {
  const alternative =
    proposal.appliedAlternative === null
      ? undefined
      : proposal.alternatives[proposal.appliedAlternative];
  return proposal.clusterIds.map((id, index) => ({
    id,
    name:
      clusterNameById.get(id) ??
      alternative?.clusters[index]?.name ??
      proposal.name,
  }));
}

function mergeOverlapsByProposal(
  proposals: NewClusterProposal[],
  clusterNameById: Map<string, string>,
): Map<string, MergeOverlap[]> {
  const mergedClusters = proposals.flatMap((proposal) => {
    const alternative =
      proposal.appliedAlternative === null
        ? undefined
        : proposal.alternatives[proposal.appliedAlternative];
    if (alternative?.kind !== "merge") return [];
    const links = createdClustersOf(proposal, clusterNameById);
    return links.map((cluster, index) => ({
      cluster,
      tickers: new Set(
        alternative.clusters[index]?.members.map((m) => m.ticker) ?? [],
      ),
    }));
  });

  const overlaps = new Map<string, MergeOverlap[]>();
  for (const proposal of proposals) {
    if (proposal.status !== "pending") continue;
    const found = mergedClusters
      .map(({ cluster, tickers }) => ({
        cluster,
        tickers: proposal.members
          .map((member) => member.ticker)
          .filter((ticker) => tickers.has(ticker)),
      }))
      .filter((overlap) => overlap.tickers.length > 0);
    if (found.length > 0) overlaps.set(proposal.id, found);
  }
  return overlaps;
}

export function ProposalsPanel({
  scanDate,
  hits,
  trackedClusters,
}: ProposalsPanelProps) {
  const proposals = useScanProposals(scanDate);

  const tierBySymbol = useMemo(
    () =>
      new Map<string, Tier | null>(hits.map((hit) => [hit.symbol, hit.tier])),
    [hits],
  );
  const hitSymbols = useMemo(() => hits.map((hit) => hit.symbol), [hits]);
  const clusterNameById = useMemo(
    () => new Map(trackedClusters.map((cluster) => [cluster.id, cluster.name])),
    [trackedClusters],
  );
  const mergeOverlaps = useMemo(
    () =>
      mergeOverlapsByProposal(
        proposals.data?.newClusters ?? [],
        clusterNameById,
      ),
    [proposals.data, clusterNameById],
  );

  if (proposals.isLoading) {
    return <LoadingSpinner label="Loading proposals..." />;
  }

  if (proposals.error) {
    return (
      <Alert variant="danger">
        <AlertDescription>
          Couldn't load proposals: {proposals.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const { run, newClusters, additions, unclustered } = proposals.data!;

  if (
    newClusters.length === 0 &&
    additions.length === 0 &&
    unclustered.length === 0
  ) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {run === null
          ? "No cluster proposals yet for this scan."
          : "The AI found no clusters in this scan."}
      </p>
    );
  }

  return (
    <section aria-label="Cluster proposals" className="space-y-4">
      {newClusters.length > 0 && (
        <div className="space-y-2">
          <h2 className={SECTION_TITLE_CLASS}>
            New clusters ({newClusters.length})
          </h2>
          {newClusters.map((proposal) => (
            <NewClusterProposalCard
              key={proposal.id}
              proposal={proposal}
              createdClusters={createdClustersOf(proposal, clusterNameById)}
              mergeOverlaps={mergeOverlaps.get(proposal.id) ?? []}
              tierBySymbol={tierBySymbol}
              hitSymbols={hitSymbols}
            />
          ))}
        </div>
      )}

      {additions.length > 0 && (
        <div className="space-y-2">
          <h2 className={SECTION_TITLE_CLASS}>
            Additions to tracked clusters ({additions.length})
          </h2>
          <ul className="rounded-md border border-slate-200 bg-white px-4 py-1 dark:border-slate-700 dark:bg-slate-900">
            {additions.map((addition) => (
              <AdditionProposalRow
                key={addition.id}
                addition={addition}
                tier={tierBySymbol.get(addition.ticker) ?? null}
              />
            ))}
          </ul>
        </div>
      )}

      {unclustered.length > 0 && (
        <details className="rounded-md border border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
          <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
            Unclustered hits ({unclustered.length})
          </summary>
          <ul className="mt-2 space-y-1 text-sm">
            {unclustered.map((hit) => (
              <li key={hit.ticker} className="flex gap-2">
                <span className="w-16 shrink-0 font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {hit.ticker}
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {hit.reason}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
