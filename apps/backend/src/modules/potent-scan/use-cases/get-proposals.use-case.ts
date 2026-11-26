import { Inject, Injectable } from '@nestjs/common';
import { PROPOSAL_REPOSITORY } from '../constants/tokens';
import type { ProposalRepository } from '../domain/repositories/proposal.repository.interface';
import { Proposal, ProposalStatus } from '../domain/entities/proposal';
import {
  NewClusterProposal,
  ProposedAddition,
  UnclusteredHit,
} from '../domain/value-objects/cluster-proposal';
import { SessionDate } from '../domain/value-objects/session-date';

export interface GetProposalsRequestDto {
  sessionDate: SessionDate;
}

interface ProposalDecisionDto {
  id: string;
  status: ProposalStatus;
  appliedAlternative: number | null;
  clusterIds: string[];
  createdAt: string;
  decidedAt: string | null;
}

export type NewClusterProposalDto = ProposalDecisionDto & NewClusterProposal;
export type AdditionProposalDto = ProposalDecisionDto & ProposedAddition;

export interface ProposalRunDto {
  model: string;
  finishedAt: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  dropped: string[];
}

export interface GetProposalsResponseDto {
  scanDate: string;
  run: ProposalRunDto | null;
  newClusters: NewClusterProposalDto[];
  additions: AdditionProposalDto[];
  unclustered: UnclusteredHit[];
}

const decisionOf = (proposal: Proposal): ProposalDecisionDto => ({
  id: proposal.id.value,
  status: proposal.status,
  appliedAlternative: proposal.appliedAlternative,
  clusterIds: proposal.clusterIds.map((id) => id.value),
  createdAt: proposal.createdAt.toISOString(),
  decidedAt: proposal.decidedAt?.toISOString() ?? null,
});

@Injectable()
export class GetProposalsUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly repository: ProposalRepository,
  ) {}

  async execute(
    request: GetProposalsRequestDto,
  ): Promise<GetProposalsResponseDto> {
    const [proposals, run] = await Promise.all([
      this.repository.findByScanDate(request.sessionDate),
      this.repository.findLatestSucceededRun(request.sessionDate),
    ]);

    const newClusters: NewClusterProposalDto[] = [];
    const additions: AdditionProposalDto[] = [];
    for (const proposal of proposals) {
      if (proposal.content.kind === 'new_cluster') {
        newClusters.push({
          ...decisionOf(proposal),
          ...proposal.content.cluster,
        });
      } else {
        additions.push({
          ...decisionOf(proposal),
          ...proposal.content.addition,
        });
      }
    }

    return {
      scanDate: request.sessionDate.value,
      run: run && {
        model: run.model,
        finishedAt: run.finishedAt.toISOString(),
        inputTokens: run.usage.inputTokens,
        outputTokens: run.usage.outputTokens,
        costUsd: run.usage.costUsd,
        dropped: run.dropped,
      },
      newClusters,
      additions,
      unclustered: run?.unclustered ?? [],
    };
  }
}
