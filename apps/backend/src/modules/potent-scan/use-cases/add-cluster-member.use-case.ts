import { Inject, Injectable } from '@nestjs/common';
import { CLUSTER_REPOSITORY } from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { NotFoundError } from '../domain/domain-errors';
import { Symbol } from '../../../shared/value-objects/symbol';

export interface AddClusterMemberRequestDto {
  clusterId: ClusterId;
  ticker: Symbol;
}

@Injectable()
export class AddClusterMemberUseCase {
  constructor(
    @Inject(CLUSTER_REPOSITORY)
    private readonly repository: ClusterRepository,
  ) {}

  async execute(request: AddClusterMemberRequestDto): Promise<void> {
    const cluster = await this.repository.findById(request.clusterId);
    if (!cluster) {
      throw new NotFoundError(`Cluster ${request.clusterId.value} not found`);
    }
    cluster.addMember({
      ticker: request.ticker,
      reason: null,
      catalyst: null,
      source: null,
    });
    await this.repository.save(cluster);
  }
}
