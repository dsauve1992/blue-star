import { Inject, Injectable } from '@nestjs/common';
import { PROPOSAL_REPOSITORY } from '../constants/tokens';
import type { ProposalRepository } from '../domain/repositories/proposal.repository.interface';
import { ProposalId } from '../domain/value-objects/proposal-id';
import { NotFoundError, StateError } from '../domain/domain-errors';

export interface RejectProposalRequestDto {
  proposalId: ProposalId;
}

@Injectable()
export class RejectProposalUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly repository: ProposalRepository,
  ) {}

  async execute(request: RejectProposalRequestDto): Promise<void> {
    const proposal = await this.repository.findById(request.proposalId);
    if (!proposal) {
      throw new NotFoundError(`Proposal ${request.proposalId.value} not found`);
    }
    proposal.reject();
    if (!(await this.repository.saveDecision(proposal))) {
      throw new StateError(
        `Proposal ${proposal.id.value} was decided by another request`,
      );
    }
  }
}
