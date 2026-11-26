import { Test } from '@nestjs/testing';
import { CLUSTER_REPOSITORY } from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import { cluster } from '../test/fixtures';
import { toClusterDto } from './cluster.dto';
import { ListClustersUseCase } from './list-clusters.use-case';

describe('ListClustersUseCase', () => {
  let useCase: ListClustersUseCase;
  let repository: jest.Mocked<ClusterRepository>;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([cluster()]),
    };
    const module = await Test.createTestingModule({
      providers: [
        ListClustersUseCase,
        { provide: CLUSTER_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = module.get(ListClustersUseCase);
  });

  it('should list clusters filtered by status', async () => {
    const result = await useCase.execute({ status: 'tracking' });

    expect(repository.findAll).toHaveBeenNthCalledWith(1, 'tracking');
    expect(result).toEqual({ clusters: [toClusterDto(cluster())] });
  });

  it('should list every cluster without a status', async () => {
    await useCase.execute({});

    expect(repository.findAll).toHaveBeenNthCalledWith(1, undefined);
  });
});
