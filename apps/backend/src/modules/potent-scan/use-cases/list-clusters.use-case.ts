import { Inject, Injectable } from '@nestjs/common';
import {
  CLUSTER_REPOSITORY,
  MEMBER_TIER_REPOSITORY,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { MemberTierRepository } from '../domain/repositories/member-tier.repository.interface';
import { ClusterStatus } from '../domain/entities/cluster';
import { ClusterSummaryDto, toClusterSummaryDto } from './cluster.dto';

export interface ListClustersRequestDto {
  status?: ClusterStatus;
}

export interface ListClustersResponseDto {
  clusters: ClusterSummaryDto[];
}

@Injectable()
export class ListClustersUseCase {
  constructor(
    @Inject(CLUSTER_REPOSITORY)
    private readonly repository: ClusterRepository,
    @Inject(MEMBER_TIER_REPOSITORY)
    private readonly tierRepository: MemberTierRepository,
  ) {}

  async execute(
    request: ListClustersRequestDto,
  ): Promise<ListClustersResponseDto> {
    const clusters = await this.repository.findAll(request.status);
    const clusterIds = clusters.map((cluster) => cluster.id);
    const [dailyCounts, activeLeadCounts] = await Promise.all([
      this.tierRepository.dailyCountsByCluster(clusterIds),
      this.tierRepository.activeLeadCountsOnLatestDate(clusterIds),
    ]);
    return {
      clusters: clusters.map((cluster) =>
        toClusterSummaryDto(
          cluster,
          dailyCounts.get(cluster.id.value) ?? [],
          activeLeadCounts.get(cluster.id.value) ?? 0,
        ),
      ),
    };
  }
}
