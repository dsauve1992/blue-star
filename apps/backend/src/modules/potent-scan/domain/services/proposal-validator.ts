import { MAX_CLUSTER_NAME_LENGTH } from '../entities/cluster';
import {
  ClusterProposalSet,
  NewClusterProposal,
  ProposalAlternative,
  ProposedAddition,
  ProposedCluster,
  ProposedMember,
  TrackedClusterContext,
  UnclusteredHit,
  ValidatedProposalSet,
} from '../value-objects/cluster-proposal';

export const MIN_NEW_CLUSTER_MEMBERS = 3;

export interface ProposalValidationContext {
  hitSymbols: Set<string>;
  trackedClusters: TrackedClusterContext[];
  knownSources: Set<string>;
}

export interface ProposalValidationResult {
  proposals: ValidatedProposalSet;
  dropped: string[];
}

const normalizeTicker = (ticker: string): string => ticker.trim().toUpperCase();

export function validateProposals(
  raw: ClusterProposalSet,
  context: ProposalValidationContext,
): ProposalValidationResult {
  const dropped: string[] = [];
  const trackedMembers = new Set(
    context.trackedClusters.flatMap((cluster) =>
      cluster.activeMembers.map((member) => member.ticker),
    ),
  );
  const isEligible = (ticker: string) =>
    context.hitSymbols.has(ticker) || trackedMembers.has(ticker);

  const knownSource = (url: string | null, label: string): string | null => {
    const trimmed = url?.trim();
    if (!trimmed) return null;
    if (context.knownSources.has(trimmed)) return trimmed;
    dropped.push(`${label}: source not from research (${trimmed})`);
    return null;
  };

  const validCluster = (
    cluster: ProposedCluster,
    label: string,
  ): ProposedCluster | null => {
    const members: ProposedMember[] = [];
    for (const member of cluster.members) {
      const ticker = normalizeTicker(member.ticker);
      if (!isEligible(ticker)) {
        dropped.push(
          `${label}: ${ticker || '?'} is neither a hit nor a tracked member`,
        );
        continue;
      }
      if (members.some((kept) => kept.ticker === ticker)) {
        dropped.push(`${label}: duplicate member ${ticker}`);
        continue;
      }
      members.push({
        ticker,
        reason: member.reason.trim(),
        catalystToday: member.catalystToday.trim(),
        source: knownSource(member.source, `${label} ${ticker}`),
      });
    }
    if (!cluster.name.trim()) {
      dropped.push(`${label}: no name`);
      return null;
    }
    if (cluster.name.trim().length > MAX_CLUSTER_NAME_LENGTH) {
      dropped.push(
        `${label}: name longer than ${MAX_CLUSTER_NAME_LENGTH} characters`,
      );
      return null;
    }
    if (members.length < MIN_NEW_CLUSTER_MEMBERS) {
      dropped.push(
        `${label}: ${members.length} valid member(s), needs ${MIN_NEW_CLUSTER_MEMBERS}`,
      );
      return null;
    }
    return {
      name: cluster.name.trim(),
      description: cluster.description.trim(),
      sharedCatalyst: cluster.sharedCatalyst.trim(),
      sources: cluster.sources
        .map((source) => knownSource(source, label))
        .filter((source): source is string => source !== null),
      members,
    };
  };

  const validAlternative = (
    alternative: ProposalAlternative,
    label: string,
  ): ProposalAlternative | null => {
    const clusters = alternative.clusters.map((cluster, index) =>
      validCluster(cluster, `${label} cluster ${index + 1}`),
    );
    if (clusters.length === 0 || clusters.some((c) => c === null)) {
      dropped.push(`${label}: dropped`);
      return null;
    }
    return {
      kind: alternative.kind,
      description: alternative.description.trim(),
      clusters: clusters as ProposedCluster[],
    };
  };

  const newClusters: NewClusterProposal[] = [];
  for (const proposal of raw.newClusters) {
    const label = `Cluster "${proposal.name}"`;
    const cluster = validCluster(proposal, label);
    if (!cluster) continue;
    const alternatives = proposal.alternatives
      .map((alternative, index) =>
        validAlternative(
          alternative,
          `${label} alternative ${index + 1} (${alternative.kind})`,
        ),
      )
      .filter((alternative) => alternative !== null);
    newClusters.push({ ...cluster, alternatives });
  }

  const additions: ProposedAddition[] = [];
  for (const addition of raw.additions) {
    const ticker = normalizeTicker(addition.ticker);
    const clusterId = addition.existingClusterId.trim();
    const label = `Addition ${ticker || '?'} to ${clusterId}`;
    const cluster = context.trackedClusters.find((c) => c.id === clusterId);
    if (!cluster) {
      dropped.push(`${label}: unknown tracked cluster`);
    } else if (!isEligible(ticker)) {
      dropped.push(`${label}: neither a hit nor a tracked member`);
    } else if (cluster.activeMembers.some((m) => m.ticker === ticker)) {
      dropped.push(`${label}: already an active member`);
    } else if (
      additions.some(
        (kept) =>
          kept.existingClusterId === clusterId && kept.ticker === ticker,
      )
    ) {
      dropped.push(`${label}: duplicate`);
    } else {
      additions.push({
        existingClusterId: clusterId,
        existingClusterName: cluster.name,
        ticker,
        reason: addition.reason.trim(),
        source: knownSource(addition.source, label),
      });
    }
  }

  const unclustered: UnclusteredHit[] = [];
  for (const item of raw.unclustered) {
    const ticker = normalizeTicker(item.ticker);
    if (!context.hitSymbols.has(ticker)) {
      dropped.push(`Unclustered ${ticker || '?'}: not a hit`);
    } else if (!unclustered.some((kept) => kept.ticker === ticker)) {
      unclustered.push({ ticker, reason: item.reason.trim() });
    }
  }

  return { proposals: { newClusters, additions, unclustered }, dropped };
}
