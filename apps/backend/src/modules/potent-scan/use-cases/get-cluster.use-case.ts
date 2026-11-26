import { Inject, Injectable } from '@nestjs/common';
import {
  CLUSTER_REPOSITORY,
  MEMBER_TIER_REPOSITORY,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { MemberTierRepository } from '../domain/repositories/member-tier.repository.interface';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { NotFoundError } from '../domain/domain-errors';
import { ClusterDetailDto, toClusterDetailDto } from './cluster.dto';

export interface GetClusterRequestDto {
  clusterId: ClusterId;
}

@Injectable()
export class GetClusterUseCase {
  constructor(
    @Inject(CLUSTER_REPOSITORY)
    private readonly repository: ClusterRepository,
    @Inject(MEMBER_TIER_REPOSITORY)
    private readonly tierRepository: MemberTierRepository,
  ) {}

  async execute(request: GetClusterRequestDto): Promise<ClusterDetailDto> {
    const cluster = await this.repository.findById(request.clusterId);
    if (!cluster) {
      throw new NotFoundError(`Cluster ${request.clusterId.value} not found`);
    }
    const [tiers, dailyCounts] = await Promise.all([
      this.tierRepository.findByCluster(cluster.id),
      this.tierRepository.dailyCountsByCluster([cluster.id]),
    ]);
    return toClusterDetailDto(
      cluster,
      tiers,
      dailyCounts.get(cluster.id.value) ?? [],
    );
  }
}
