import { Inject, Injectable } from '@nestjs/common';
import {
  CLUSTER_REPOSITORY,
  HIT_RESEARCH_REPOSITORY,
  POTENT_SCAN_REPOSITORY,
  PROPOSAL_REPOSITORY,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { HitResearchRepository } from '../domain/repositories/hit-research.repository.interface';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import type { ProposalRepository } from '../domain/repositories/proposal.repository.interface';
import { Cluster, NewClusterMember } from '../domain/entities/cluster';
import { Proposal } from '../domain/entities/proposal';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { ProposalId } from '../domain/value-objects/proposal-id';
import {
  InvariantError,
  NotFoundError,
  StateError,
} from '../domain/domain-errors';
import { Symbol } from '../../../shared/value-objects/symbol';

export interface ProposalEditDto {
  name?: string;
  description?: string;
  addTickers: Symbol[];
  removeTickers: Symbol[];
}

export interface AcceptProposalRequestDto {
  proposalId: ProposalId;
  edit?: ProposalEditDto;
  alternativeIndex?: number;
}

export interface AcceptProposalResponseDto {
  clusterIds: ClusterId[];
}

@Injectable()
export class AcceptProposalUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposalRepository: ProposalRepository,
    @Inject(CLUSTER_REPOSITORY)
    private readonly clusterRepository: ClusterRepository,
    @Inject(POTENT_SCAN_REPOSITORY)
    private readonly scanRepository: PotentScanRepository,
    @Inject(HIT_RESEARCH_REPOSITORY)
    private readonly researchRepository: HitResearchRepository,
  ) {}

  async execute(
    request: AcceptProposalRequestDto,
  ): Promise<AcceptProposalResponseDto> {
    const proposal = await this.proposalRepository.findById(request.proposalId);
    if (!proposal) {
      throw new NotFoundError(`Proposal ${request.proposalId.value} not found`);
    }
    if (request.edit && request.alternativeIndex !== undefined) {
      throw new InvariantError(
        'Accept with an edit or an alternative, not both',
      );
    }

    const clusters = await this.decide(proposal, request);
    if (!(await this.proposalRepository.saveDecision(proposal))) {
      throw new StateError(
        `Proposal ${proposal.id.value} was decided by another request`,
      );
    }
    for (const cluster of clusters) {
      await this.clusterRepository.save(cluster);
    }
    return { clusterIds: clusters.map((cluster) => cluster.id) };
  }

  private async decide(
    proposal: Proposal,
    request: AcceptProposalRequestDto,
  ): Promise<Cluster[]> {
    if (proposal.content.kind === 'addition') {
      if (request.edit || request.alternativeIndex !== undefined) {
        throw new InvariantError('An addition is accepted as proposed');
      }
      const clusterId = ClusterId.of(proposal.addition().existingClusterId);
      const cluster = await this.clusterRepository.findById(clusterId);
      if (!cluster) {
        throw new NotFoundError(`Cluster ${clusterId.value} not found`);
      }
      proposal.acceptAddition(cluster);
      return [cluster];
    }
    if (request.alternativeIndex !== undefined) {
      return proposal.applyAlternative(request.alternativeIndex);
    }
    if (request.edit) {
      return [
        proposal.acceptEdited({
          name: request.edit.name,
          description: request.edit.description,
          removeTickers: request.edit.removeTickers,
          addMembers: await this.addedMembers(
            proposal,
            request.edit.addTickers,
          ),
        }),
      ];
    }
    return proposal.accept();
  }

  private async addedMembers(
    proposal: Proposal,
    tickers: Symbol[],
  ): Promise<NewClusterMember[]> {
    if (tickers.length === 0) return [];
    const scan = await this.scanRepository.findBySessionDate(proposal.scanDate);
    if (!scan) {
      throw new NotFoundError(
        `No potent scan for session ${proposal.scanDate.value}`,
      );
    }
    const hitSymbols = new Set(scan.hits.map((hit) => hit.symbol));
    const notHits = tickers.filter((ticker) => !hitSymbols.has(ticker.value));
    if (notHits.length > 0) {
      throw new InvariantError(
        `Not hits of the ${proposal.scanDate.value} scan: ${notHits.map((t) => t.value).join(', ')}`,
      );
    }
    const research = await this.researchRepository.findByScanDate(
      proposal.scanDate,
    );
    return tickers.map((ticker) => {
      const found = research.find((item) => item.symbol === ticker.value);
      return {
        ticker,
        reason: null,
        catalyst: found?.catalystToday ?? null,
        source: found?.source ?? null,
      };
    });
  }
}
