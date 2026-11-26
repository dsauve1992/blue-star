import { Inject, Injectable } from '@nestjs/common';
import {
  CLUSTER_REPOSITORY,
  POTENT_SCAN_REPOSITORY,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import { Cluster } from '../domain/entities/cluster';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { SessionDate } from '../domain/value-objects/session-date';
import { InvariantError, NotFoundError } from '../domain/domain-errors';
import { Symbol } from '../../../shared/value-objects/symbol';

export interface CreateClusterRequestDto {
  name: string;
  description: string;
  tickers: Symbol[];
  sourceScanDate: SessionDate;
}

export interface CreateClusterResponseDto {
  clusterId: ClusterId;
}

@Injectable()
export class CreateClusterUseCase {
  constructor(
    @Inject(CLUSTER_REPOSITORY)
    private readonly clusterRepository: ClusterRepository,
    @Inject(POTENT_SCAN_REPOSITORY)
    private readonly scanRepository: PotentScanRepository,
  ) {}

  async execute(
    request: CreateClusterRequestDto,
  ): Promise<CreateClusterResponseDto> {
    const scan = await this.scanRepository.findBySessionDate(
      request.sourceScanDate,
    );
    if (!scan) {
      throw new NotFoundError(
        `No potent scan for session ${request.sourceScanDate.value}`,
      );
    }

    const hitSymbols = new Set(scan.hits.map((hit) => hit.symbol));
    const notHits = request.tickers.filter(
      (ticker) => !hitSymbols.has(ticker.value),
    );
    if (notHits.length > 0) {
      throw new InvariantError(
        `Not hits of the ${request.sourceScanDate.value} scan: ${notHits.map((t) => t.value).join(', ')}`,
      );
    }

    const cluster = Cluster.create({
      name: request.name,
      description: request.description,
      sharedCatalyst: null,
      sources: [],
      originProposalId: null,
      sourceScanDate: request.sourceScanDate,
      members: request.tickers.map((ticker) => ({
        ticker,
        reason: null,
        catalyst: null,
        source: null,
      })),
    });
    await this.clusterRepository.save(cluster);
    return { clusterId: cluster.id };
  }
}
