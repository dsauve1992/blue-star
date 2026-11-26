import { ResearchUsage } from './hit-research';
import { SessionDate } from './session-date';

export const ALTERNATIVE_KINDS = ['split', 'merge'] as const;

export type AlternativeKind = (typeof ALTERNATIVE_KINDS)[number];

export interface ProposedMember {
  ticker: string;
  reason: string;
  catalystToday: string;
  source: string | null;
}

export interface ProposedCluster {
  name: string;
  description: string;
  sharedCatalyst: string;
  sources: string[];
  members: ProposedMember[];
}

export interface ProposalAlternative {
  kind: AlternativeKind;
  description: string;
  clusters: ProposedCluster[];
}

export interface NewClusterProposal extends ProposedCluster {
  alternatives: ProposalAlternative[];
}

export interface RawAddition {
  existingClusterId: string;
  ticker: string;
  reason: string;
  source: string | null;
}

export interface ProposedAddition extends RawAddition {
  existingClusterName: string;
}

export interface UnclusteredHit {
  ticker: string;
  reason: string;
}

export interface ClusterProposalSet {
  newClusters: NewClusterProposal[];
  additions: RawAddition[];
  unclustered: UnclusteredHit[];
}

export interface ValidatedProposalSet {
  newClusters: NewClusterProposal[];
  additions: ProposedAddition[];
  unclustered: UnclusteredHit[];
}

export interface TrackedClusterContext {
  id: string;
  name: string;
  sharedCatalyst: string | null;
  sources: string[];
  activeMembers: { ticker: string; source: string | null }[];
}

export interface ProposalRun {
  scanDate: SessionDate;
  status: 'succeeded' | 'failed';
  model: string;
  proposalCount: number;
  unclustered: UnclusteredHit[];
  dropped: string[];
  usage: ResearchUsage;
  error: string | null;
  startedAt: Date;
  finishedAt: Date;
}
