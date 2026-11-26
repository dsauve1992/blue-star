import { Inject, Injectable } from '@nestjs/common';
import { CLUSTER_REPOSITORY } from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { NotFoundError } from '../domain/domain-errors';

export interface CloseClusterRequestDto {
  clusterId: ClusterId;
}

@Injectable()
export class CloseClusterUseCase {
  constructor(
    @Inject(CLUSTER_REPOSITORY)
    private readonly repository: ClusterRepository,
  ) {}

  async execute(request: CloseClusterRequestDto): Promise<void> {
    const cluster = await this.repository.findById(request.clusterId);
    if (!cluster) {
      throw new NotFoundError(`Cluster ${request.clusterId.value} not found`);
    }
    cluster.close();
    await this.repository.save(cluster);
  }
}
