import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CLUSTER_PROPOSER,
  CLUSTER_REPOSITORY,
  HIT_RESEARCH_REPOSITORY,
  POTENT_SCAN_REPOSITORY,
  PROPOSAL_REPOSITORY,
} from '../constants/tokens';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import type { HitResearchRepository } from '../domain/repositories/hit-research.repository.interface';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { ProposalRepository } from '../domain/repositories/proposal.repository.interface';
import {
  ClusterProposalError,
  type ClusterProposalResult,
  type ClusterProposer,
} from '../domain/services/cluster-proposer.service';
import { validateProposals } from '../domain/services/proposal-validator';
import { Proposal } from '../domain/entities/proposal';
import { TrackedClusterContext } from '../domain/value-objects/cluster-proposal';
import { NO_USAGE, ResearchUsage } from '../domain/value-objects/hit-research';
import { SessionDate } from '../domain/value-objects/session-date';
import { NotFoundError, StateError } from '../domain/domain-errors';

export interface ProposeClustersRequestDto {
  sessionDate: SessionDate;
}

export interface ProposeClustersResponseDto {
  sessionDate: SessionDate;
  newClusterCount: number;
  additionCount: number;
  unclusteredCount: number;
  droppedCount: number;
  usage: ResearchUsage;
}

@Injectable()
export class ProposeClustersUseCase {
  private readonly logger = new Logger(ProposeClustersUseCase.name);

  constructor(
    @Inject(POTENT_SCAN_REPOSITORY)
    private readonly scanRepository: PotentScanRepository,
    @Inject(HIT_RESEARCH_REPOSITORY)
    private readonly researchRepository: HitResearchRepository,
    @Inject(CLUSTER_REPOSITORY)
    private readonly clusterRepository: ClusterRepository,
    @Inject(CLUSTER_PROPOSER)
    private readonly proposer: ClusterProposer,
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposalRepository: ProposalRepository,
  ) {}

  async execute(
    request: ProposeClustersRequestDto,
  ): Promise<ProposeClustersResponseDto> {
    const scanDate = request.sessionDate;
    const scan = await this.scanRepository.findBySessionDate(scanDate);
    if (!scan) {
      throw new NotFoundError(`No potent scan for ${scanDate.value}`);
    }
    const research = await this.researchRepository.findByScanDate(scanDate);
    if (research.length === 0) {
      throw new StateError(`No hit research for ${scanDate.value}`);
    }
    const trackedClusters: TrackedClusterContext[] = (
      await this.clusterRepository.findAll('tracking')
    ).map((cluster) => ({
      id: cluster.id.value,
      name: cluster.name,
      sharedCatalyst: cluster.sharedCatalyst,
      sources: cluster.sources,
      activeMembers: cluster.members
        .filter((member) => member.removedAt === null)
        .map((member) => ({
          ticker: member.ticker.value,
          source: member.source,
        })),
    }));

    const startedAt = new Date();
    const failedRun = (
      usage: ResearchUsage,
      error: string,
      dropped: string[],
    ) => ({
      scanDate,
      status: 'failed' as const,
      model: this.proposer.model,
      proposalCount: 0,
      unclustered: [],
      dropped,
      usage,
      error,
      startedAt,
      finishedAt: new Date(),
    });

    let output: ClusterProposalResult;
    try {
      output = await this.proposer.propose({
        scanDate,
        research,
        trackedClusters,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.proposalRepository.recordRun(
        failedRun(
          error instanceof ClusterProposalError ? error.usage : NO_USAGE,
          message,
          [],
        ),
      );
      throw error;
    }

    const { proposals, dropped } = validateProposals(output.proposals, {
      hitSymbols: new Set(scan.hits.map((hit) => hit.symbol)),
      trackedClusters,
      knownSources: new Set([
        ...research.flatMap((item) => (item.source ? [item.source] : [])),
        ...trackedClusters.flatMap((cluster) => [
          ...cluster.sources,
          ...cluster.activeMembers.flatMap((m) => (m.source ? [m.source] : [])),
        ]),
      ]),
    });
    if (dropped.length > 0) {
      this.logger.warn(
        `Potent proposals ${scanDate.value} dropped ${dropped.length} item(s): ${dropped.join('; ')}`,
      );
    }

    const { newClusters, additions, unclustered } = proposals;
    if (newClusters.length + additions.length + unclustered.length === 0) {
      const message = `Clustering for ${scanDate.value} produced nothing valid (${dropped.length} item(s) dropped)`;
      await this.proposalRepository.recordRun(
        failedRun(output.usage, message, dropped),
      );
      throw new StateError(message);
    }

    const stored = [
      ...newClusters.map((cluster) =>
        Proposal.propose(scanDate, { kind: 'new_cluster', cluster }),
      ),
      ...additions.map((addition) =>
        Proposal.propose(scanDate, { kind: 'addition', addition }),
      ),
    ];
    await this.proposalRepository.replacePending(stored, {
      scanDate,
      status: 'succeeded',
      model: this.proposer.model,
      proposalCount: stored.length,
      unclustered,
      dropped,
      usage: output.usage,
      error: null,
      startedAt,
      finishedAt: new Date(),
    });

    this.logger.log(
      `Potent proposals ${scanDate.value}: ${newClusters.length} clusters, ` +
        `${additions.length} additions, ${unclustered.length} unclustered, ` +
        `${output.usage.inputTokens} in / ${output.usage.outputTokens} out tokens, ` +
        `$${output.usage.costUsd.toFixed(4)}`,
    );

    return {
      sessionDate: scanDate,
      newClusterCount: newClusters.length,
      additionCount: additions.length,
      unclusteredCount: unclustered.length,
      droppedCount: dropped.length,
      usage: output.usage,
    };
  }
}
