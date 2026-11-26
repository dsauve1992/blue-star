import { Proposal } from '../entities/proposal';
import { ProposalRun } from '../value-objects/cluster-proposal';
import { ProposalId } from '../value-objects/proposal-id';
import { SessionDate } from '../value-objects/session-date';

export interface ProposalRepository {
  replacePending(proposals: Proposal[], run: ProposalRun): Promise<void>;
  recordRun(run: ProposalRun): Promise<void>;
  saveDecision(proposal: Proposal): Promise<boolean>;
  findById(id: ProposalId): Promise<Proposal | null>;
  findByScanDate(scanDate: SessionDate): Promise<Proposal[]>;
  findLatestSucceededRun(scanDate: SessionDate): Promise<ProposalRun | null>;
}
