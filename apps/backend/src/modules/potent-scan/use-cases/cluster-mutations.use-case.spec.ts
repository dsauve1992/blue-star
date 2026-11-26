import { Test } from '@nestjs/testing';
import { UuidGeneratorService } from '../../../shared/services/uuid-generator.service';
import { Symbol } from '../../../shared/value-objects/symbol';
import { CLUSTER_REPOSITORY } from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { NotFoundError, StateError } from '../domain/domain-errors';
import { CLUSTER_ID, cluster, clusterMember, memberId } from '../test/fixtures';
import { AddClusterMemberUseCase } from './add-cluster-member.use-case';
import { RemoveClusterMemberUseCase } from './remove-cluster-member.use-case';
import { CloseClusterUseCase } from './close-cluster.use-case';
import { UpdateClusterUseCase } from './update-cluster.use-case';

describe('Cluster mutation use cases', () => {
  const NOW = new Date('2026-11-27T15:00:00.000Z');
  const clusterId = ClusterId.of(CLUSTER_ID);
  let repository: jest.Mocked<ClusterRepository>;
  let addMember: AddClusterMemberUseCase;
  let removeMember: RemoveClusterMemberUseCase;
  let closeCluster: CloseClusterUseCase;
  let updateCluster: UpdateClusterUseCase;

  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW });
    repository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(cluster()),
      findAll: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        AddClusterMemberUseCase,
        RemoveClusterMemberUseCase,
        CloseClusterUseCase,
        UpdateClusterUseCase,
        { provide: CLUSTER_REPOSITORY, useValue: repository },
      ],
    }).compile();
    addMember = module.get(AddClusterMemberUseCase);
    removeMember = module.get(RemoveClusterMemberUseCase);
    closeCluster = module.get(CloseClusterUseCase);
    updateCluster = module.get(UpdateClusterUseCase);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should save the cluster with the added member', async () => {
    jest
      .spyOn(UuidGeneratorService, 'generate')
      .mockReset()
      .mockReturnValueOnce(memberId('CCC'));

    await addMember.execute({ clusterId, ticker: Symbol.of('CCC') });

    expect(repository.findById).toHaveBeenNthCalledWith(1, clusterId);
    expect(repository.save).toHaveBeenNthCalledWith(
      1,
      cluster({
        members: [
          clusterMember('AAA'),
          clusterMember('BBB'),
          clusterMember('CCC', { joinedAt: NOW }),
        ],
      }),
    );
  });

  it('should save the cluster with the member soft-removed', async () => {
    await removeMember.execute({ clusterId, ticker: Symbol.of('AAA') });

    expect(repository.save).toHaveBeenNthCalledWith(
      1,
      cluster({
        members: [
          clusterMember('AAA', { removedAt: NOW }),
          clusterMember('BBB'),
        ],
      }),
    );
  });

  it('should save the cluster closed', async () => {
    await closeCluster.execute({ clusterId });

    expect(repository.save).toHaveBeenNthCalledWith(
      1,
      cluster({ status: 'closed', closedAt: NOW }),
    );
  });

  it('should save the cluster renamed', async () => {
    await updateCluster.execute({ clusterId, name: 'Uranium' });

    expect(repository.save).toHaveBeenNthCalledWith(
      1,
      cluster({ name: 'Uranium' }),
    );
  });

  it('should not save when the closed cluster rejects a member change', async () => {
    repository.findById.mockResolvedValue(
      cluster({ status: 'closed', closedAt: NOW }),
    );

    await expect(
      addMember.execute({ clusterId, ticker: Symbol.of('CCC') }),
    ).rejects.toThrow(StateError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([
    ['add', () => addMember.execute({ clusterId, ticker: Symbol.of('CCC') })],
    [
      'remove',
      () => removeMember.execute({ clusterId, ticker: Symbol.of('AAA') }),
    ],
    ['close', () => closeCluster.execute({ clusterId })],
    ['update', () => updateCluster.execute({ clusterId, name: 'X' })],
  ])(
    'should throw NotFoundError on %s for an unknown cluster',
    async (_, run) => {
      repository.findById.mockResolvedValue(null);

      await expect(run()).rejects.toThrow(
        new NotFoundError(`Cluster ${CLUSTER_ID} not found`),
      );
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
});
