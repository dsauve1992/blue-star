import { HitResearch, ResearchUsage } from '../value-objects/hit-research';
import {
  ClusterProposalSet,
  TrackedClusterContext,
} from '../value-objects/cluster-proposal';
import { SessionDate } from '../value-objects/session-date';

export interface ClusterProposalInput {
  scanDate: SessionDate;
  research: HitResearch[];
  trackedClusters: TrackedClusterContext[];
}

export interface ClusterProposalResult {
  proposals: ClusterProposalSet;
  usage: ResearchUsage;
}

export class ClusterProposalError extends Error {
  constructor(
    message: string,
    readonly usage: ResearchUsage,
  ) {
    super(message);
    this.name = 'ClusterProposalError';
  }
}

export interface ClusterProposer {
  readonly model: string;
  propose(input: ClusterProposalInput): Promise<ClusterProposalResult>;
}
