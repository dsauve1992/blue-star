import { Test } from '@nestjs/testing';
import { CLUSTER_REPOSITORY } from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { NotFoundError } from '../domain/domain-errors';
import { CLUSTER_ID, cluster, clusterMember } from '../test/fixtures';
import { GetClusterUseCase } from './get-cluster.use-case';

describe('GetClusterUseCase', () => {
  let useCase: GetClusterUseCase;
  let repository: jest.Mocked<ClusterRepository>;

  beforeEach(async () => {
    repository = { save: jest.fn(), findById: jest.fn(), findAll: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        GetClusterUseCase,
        { provide: CLUSTER_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = module.get(GetClusterUseCase);
  });

  it('should return the cluster with removed members and origin', async () => {
    repository.findById.mockResolvedValue(
      cluster({
        status: 'closed',
        closedAt: new Date('2026-11-28T15:00:00.000Z'),
        members: [
          clusterMember('AAA', {
            removedAt: new Date('2026-11-27T15:00:00.000Z'),
          }),
          clusterMember('BBB', { reason: 'r', catalyst: 'c', source: 's' }),
        ],
      }),
    );

    const result = await useCase.execute({
      clusterId: ClusterId.of(CLUSTER_ID),
    });

    expect(repository.findById).toHaveBeenNthCalledWith(
      1,
      ClusterId.of(CLUSTER_ID),
    );
    expect(result).toEqual({
      id: CLUSTER_ID,
      name: 'Nuclear',
      description: 'SMR names',
      sharedCatalyst: null,
      sources: [],
      origin: 'manual',
      sourceScanDate: '2026-11-25',
      createdAt: '2026-11-26T22:00:00.000Z',
      status: 'closed',
      closedAt: '2026-11-28T15:00:00.000Z',
      members: [
        {
          ticker: 'AAA',
          joinedAt: '2026-11-26T22:00:00.000Z',
          reason: null,
          catalyst: null,
          source: null,
          removedAt: '2026-11-27T15:00:00.000Z',
        },
        {
          ticker: 'BBB',
          joinedAt: '2026-11-26T22:00:00.000Z',
          reason: 'r',
          catalyst: 'c',
          source: 's',
          removedAt: null,
        },
      ],
    });
  });

  it('should expose the proposal id as origin', async () => {
    const proposalId = '22222222-2222-4222-8222-222222222222';
    repository.findById.mockResolvedValue(
      cluster({ originProposalId: proposalId }),
    );

    const result = await useCase.execute({
      clusterId: ClusterId.of(CLUSTER_ID),
    });

    expect(result.origin).toBe(proposalId);
  });

  it('should throw NotFoundError for an unknown cluster', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ clusterId: ClusterId.of(CLUSTER_ID) }),
    ).rejects.toThrow(new NotFoundError(`Cluster ${CLUSTER_ID} not found`));
  });
});
