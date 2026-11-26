import { Inject, Injectable } from '@nestjs/common';
import { CLUSTER_REPOSITORY } from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import { ClusterStatus } from '../domain/entities/cluster';
import { ClusterDto, toClusterDto } from './cluster.dto';

export interface ListClustersRequestDto {
  status?: ClusterStatus;
}

export interface ListClustersResponseDto {
  clusters: ClusterDto[];
}

@Injectable()
export class ListClustersUseCase {
  constructor(
    @Inject(CLUSTER_REPOSITORY)
    private readonly repository: ClusterRepository,
  ) {}

  async execute(
    request: ListClustersRequestDto,
  ): Promise<ListClustersResponseDto> {
    const clusters = await this.repository.findAll(request.status);
    return { clusters: clusters.map(toClusterDto) };
  }
}
