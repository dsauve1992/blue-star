import { Inject, Injectable } from '@nestjs/common';
import { CLUSTER_REPOSITORY } from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { NotFoundError } from '../domain/domain-errors';

export interface UpdateClusterRequestDto {
  clusterId: ClusterId;
  name?: string;
  description?: string;
}

@Injectable()
export class UpdateClusterUseCase {
  constructor(
    @Inject(CLUSTER_REPOSITORY)
    private readonly repository: ClusterRepository,
  ) {}

  async execute(request: UpdateClusterRequestDto): Promise<void> {
    const cluster = await this.repository.findById(request.clusterId);
    if (!cluster) {
      throw new NotFoundError(`Cluster ${request.clusterId.value} not found`);
    }
    cluster.update({ name: request.name, description: request.description });
    await this.repository.save(cluster);
  }
}
