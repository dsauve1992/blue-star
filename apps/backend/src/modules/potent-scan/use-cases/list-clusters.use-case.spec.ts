import { Test } from '@nestjs/testing';
import {
  CLUSTER_REPOSITORY,
  MEMBER_TIER_REPOSITORY,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { MemberTierRepository } from '../domain/repositories/member-tier.repository.interface';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { SessionDate } from '../domain/value-objects/session-date';
import { CLUSTER_ID, cluster } from '../test/fixtures';
import { toClusterDto } from './cluster.dto';
import { ListClustersUseCase } from './list-clusters.use-case';

describe('ListClustersUseCase', () => {
  let useCase: ListClustersUseCase;
  let repository: jest.Mocked<ClusterRepository>;
  let tierRepository: jest.Mocked<MemberTierRepository>;
  const OTHER_ID = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([cluster()]),
    };
    tierRepository = {
      saveAll: jest.fn(),
      findByCluster: jest.fn(),
      dailyCountsByCluster: jest.fn().mockResolvedValue(new Map()),
      activeLeadCountsOnLatestDate: jest.fn().mockResolvedValue(new Map()),
    };
    const module = await Test.createTestingModule({
      providers: [
        ListClustersUseCase,
        { provide: CLUSTER_REPOSITORY, useValue: repository },
        { provide: MEMBER_TIER_REPOSITORY, useValue: tierRepository },
      ],
    }).compile();
    useCase = module.get(ListClustersUseCase);
  });

  it('should list clusters filtered by status', async () => {
    const result = await useCase.execute({ status: 'tracking' });

    expect(repository.findAll).toHaveBeenNthCalledWith(1, 'tracking');
    expect(result).toEqual({
      clusters: [
        {
          ...toClusterDto(cluster()),
          leadCount: 0,
          leadShare: [],
          dailyTierCounts: [],
        },
      ],
    });
  });

  it('should list every cluster without a status', async () => {
    await useCase.execute({});

    expect(repository.findAll).toHaveBeenNthCalledWith(1, undefined);
  });

  it('should take the Lead count from the active-member count, not the latest daily count', async () => {
    tierRepository.dailyCountsByCluster.mockResolvedValue(
      new Map([
        [
          CLUSTER_ID,
          [
            {
              date: SessionDate.of('2026-11-24'),
              lead: 3,
              mediocre: 0,
              lag: 0,
            },
          ],
        ],
      ]),
    );
    tierRepository.activeLeadCountsOnLatestDate.mockResolvedValue(
      new Map([[CLUSTER_ID, 2]]),
    );

    const result = await useCase.execute({});

    expect(tierRepository.activeLeadCountsOnLatestDate).toHaveBeenNthCalledWith(
      1,
      [ClusterId.of(CLUSTER_ID)],
    );
    expect(result.clusters[0].leadCount).toBe(2);
  });

  it('should load the daily counts of every cluster in one call and derive Lead count and share', async () => {
    const other = cluster({ id: ClusterId.of(OTHER_ID) });
    repository.findAll.mockResolvedValue([cluster(), other]);
    tierRepository.dailyCountsByCluster.mockResolvedValue(
      new Map([
        [
          CLUSTER_ID,
          [
            {
              date: SessionDate.of('2026-11-24'),
              lead: 1,
              mediocre: 3,
              lag: 0,
            },
            {
              date: SessionDate.of('2026-11-25'),
              lead: 3,
              mediocre: 0,
              lag: 1,
            },
          ],
        ],
      ]),
    );

    tierRepository.activeLeadCountsOnLatestDate.mockResolvedValue(
      new Map([[CLUSTER_ID, 3]]),
    );

    const result = await useCase.execute({});

    expect(tierRepository.dailyCountsByCluster).toHaveBeenNthCalledWith(1, [
      ClusterId.of(CLUSTER_ID),
      ClusterId.of(OTHER_ID),
    ]);
    expect(tierRepository.activeLeadCountsOnLatestDate).toHaveBeenNthCalledWith(
      1,
      [ClusterId.of(CLUSTER_ID), ClusterId.of(OTHER_ID)],
    );
    expect(
      result.clusters.map(({ id, leadCount, leadShare, dailyTierCounts }) => ({
        id,
        leadCount,
        leadShare,
        dailyTierCounts,
      })),
    ).toEqual([
      {
        id: CLUSTER_ID,
        leadCount: 3,
        leadShare: [
          { date: '2026-11-24', share: 0.25 },
          { date: '2026-11-25', share: 0.75 },
        ],
        dailyTierCounts: [
          { date: '2026-11-24', lead: 1, mediocre: 3, lag: 0 },
          { date: '2026-11-25', lead: 3, mediocre: 0, lag: 1 },
        ],
      },
      { id: OTHER_ID, leadCount: 0, leadShare: [], dailyTierCounts: [] },
    ]);
  });
});
