import { Test } from '@nestjs/testing';
import {
  CLUSTER_REPOSITORY,
  MEMBER_TIER_REPOSITORY,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { MemberTierRepository } from '../domain/repositories/member-tier.repository.interface';
import { MemberTier } from '../domain/value-objects/member-tier';
import { Tier } from '../domain/value-objects/potent-scan-stock';
import { SessionDate } from '../domain/value-objects/session-date';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { NotFoundError } from '../domain/domain-errors';
import { CLUSTER_ID, cluster, clusterMember, memberId } from '../test/fixtures';
import { GetClusterUseCase } from './get-cluster.use-case';

const tierRow = (
  ticker: string,
  date: string,
  tier: Tier,
  close: number,
  adrPct: number | null,
): MemberTier => ({
  memberId: memberId(ticker),
  date: SessionDate.of(date),
  tier,
  close,
  ema9: 3,
  ema21: 2,
  ema50: 1,
  adrPct,
});

describe('GetClusterUseCase', () => {
  let useCase: GetClusterUseCase;
  let repository: jest.Mocked<ClusterRepository>;
  let tierRepository: jest.Mocked<MemberTierRepository>;

  beforeEach(async () => {
    repository = { save: jest.fn(), findById: jest.fn(), findAll: jest.fn() };
    tierRepository = {
      saveAll: jest.fn(),
      findByCluster: jest.fn().mockResolvedValue([]),
      dailyCountsByCluster: jest.fn().mockResolvedValue(new Map()),
      activeLeadCountsOnLatestDate: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        GetClusterUseCase,
        { provide: CLUSTER_REPOSITORY, useValue: repository },
        { provide: MEMBER_TIER_REPOSITORY, useValue: tierRepository },
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
          tiers: [],
          returnSinceJoinPct: null,
          adrPct: null,
        },
        {
          ticker: 'BBB',
          joinedAt: '2026-11-26T22:00:00.000Z',
          reason: 'r',
          catalyst: 'c',
          source: 's',
          removedAt: null,
          tiers: [],
          returnSinceJoinPct: null,
          adrPct: null,
        },
      ],
      dailyTierCounts: [],
    });
  });

  it('should attach each member tier series, return since join, latest ADR and the daily tier counts', async () => {
    repository.findById.mockResolvedValue(cluster());
    tierRepository.findByCluster.mockResolvedValue([
      tierRow('AAA', '2026-11-24', 'Mediocre', 40, null),
      tierRow('AAA', '2026-11-25', 'Lead', 50, 6.5),
      tierRow('BBB', '2026-11-25', 'Lag', 20, 3.1),
    ]);
    tierRepository.dailyCountsByCluster.mockResolvedValue(
      new Map([
        [
          CLUSTER_ID,
          [
            {
              date: SessionDate.of('2026-11-24'),
              lead: 0,
              mediocre: 1,
              lag: 0,
            },
            {
              date: SessionDate.of('2026-11-25'),
              lead: 1,
              mediocre: 0,
              lag: 1,
            },
          ],
        ],
      ]),
    );

    const result = await useCase.execute({
      clusterId: ClusterId.of(CLUSTER_ID),
    });

    expect(tierRepository.findByCluster).toHaveBeenNthCalledWith(
      1,
      ClusterId.of(CLUSTER_ID),
    );
    expect(tierRepository.dailyCountsByCluster).toHaveBeenNthCalledWith(1, [
      ClusterId.of(CLUSTER_ID),
    ]);
    expect(
      result.members.map(({ ticker, tiers, returnSinceJoinPct, adrPct }) => ({
        ticker,
        tiers,
        returnSinceJoinPct,
        adrPct,
      })),
    ).toEqual([
      {
        ticker: 'AAA',
        tiers: [
          { date: '2026-11-24', tier: 'Mediocre' },
          { date: '2026-11-25', tier: 'Lead' },
        ],
        returnSinceJoinPct: 25,
        adrPct: 6.5,
      },
      {
        ticker: 'BBB',
        tiers: [{ date: '2026-11-25', tier: 'Lag' }],
        returnSinceJoinPct: 0,
        adrPct: 3.1,
      },
    ]);
    expect(result.dailyTierCounts).toEqual([
      { date: '2026-11-24', lead: 0, mediocre: 1, lag: 0 },
      { date: '2026-11-25', lead: 1, mediocre: 0, lag: 1 },
    ]);
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
