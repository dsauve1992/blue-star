import { Test } from '@nestjs/testing';
import {
  CLUSTER_REPOSITORY,
  DAILY_BAR_PROVIDER,
  MEMBER_TIER_REPOSITORY,
  SESSION_CALENDAR,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { MemberTierRepository } from '../domain/repositories/member-tier.repository.interface';
import type { SessionCalendar } from '../domain/services/session-calendar.service';
import type {
  DailyBar,
  DailyBarProvider,
} from '../domain/services/daily-bar-provider.service';
import { SessionDate } from '../domain/value-objects/session-date';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { Symbol } from '../../../shared/value-objects/symbol';
import { cluster, clusterMember, memberId } from '../test/fixtures';
import { TrackMemberTiersUseCase } from './track-member-tiers.use-case';

const LAST_SESSION = '2026-11-25';
const EVENING_OF_NOV_24_ET = new Date('2026-11-25T02:00:00.000Z');

const barsUntil = (lastDate: string, count = 300): DailyBar[] => {
  const last = new Date(`${lastDate}T00:00:00.000Z`).getTime();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(last - (count - 1 - index) * 86_400_000);
    const close = 100 + index;
    return {
      date: SessionDate.of(date.toISOString().slice(0, 10)),
      high: close + 1,
      low: close - 1,
      close,
    };
  });
};

const savedRows = (repository: jest.Mocked<MemberTierRepository>) =>
  repository.saveAll.mock.calls[0][0].map((tier) => [
    tier.memberId,
    tier.date.value,
  ]);

describe('TrackMemberTiersUseCase', () => {
  let useCase: TrackMemberTiersUseCase;
  let calendar: jest.Mocked<SessionCalendar>;
  let clusters: jest.Mocked<ClusterRepository>;
  let bars: jest.Mocked<DailyBarProvider>;
  let tiers: jest.Mocked<MemberTierRepository>;

  beforeEach(async () => {
    calendar = {
      lastCompletedSession: jest
        .fn()
        .mockResolvedValue(SessionDate.of(LAST_SESSION)),
    };
    clusters = { save: jest.fn(), findById: jest.fn(), findAll: jest.fn() };
    bars = {
      dailyBarsSince: jest.fn().mockResolvedValue(barsUntil(LAST_SESSION)),
    };
    tiers = {
      saveAll: jest.fn().mockResolvedValue(undefined),
      findByCluster: jest.fn(),
      dailyCountsByCluster: jest.fn(),
      activeLeadCountsOnLatestDate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TrackMemberTiersUseCase,
        { provide: SESSION_CALENDAR, useValue: calendar },
        { provide: CLUSTER_REPOSITORY, useValue: clusters },
        { provide: DAILY_BAR_PROVIDER, useValue: bars },
        { provide: MEMBER_TIER_REPOSITORY, useValue: tiers },
      ],
    }).compile();
    useCase = module.get(TrackMemberTiersUseCase);
  });

  it('should write one tier per session from the market-date join session to the last completed session', async () => {
    clusters.findAll.mockResolvedValue([
      cluster({
        members: [clusterMember('AAA', { joinedAt: EVENING_OF_NOV_24_ET })],
      }),
    ]);

    const result = await useCase.execute();

    expect(clusters.findAll).toHaveBeenNthCalledWith(1, 'tracking');
    expect(bars.dailyBarsSince).toHaveBeenNthCalledWith(
      1,
      Symbol.of('AAA'),
      SessionDate.of('2025-10-20'),
    );
    expect(savedRows(tiers)).toEqual([
      [memberId('AAA'), '2026-11-24'],
      [memberId('AAA'), '2026-11-25'],
    ]);
    expect(result).toEqual({
      sessionDate: SessionDate.of(LAST_SESSION),
      tierCount: 2,
      failures: [],
    });
  });

  it('should ignore a bar of a session that has not completed', async () => {
    bars.dailyBarsSince.mockResolvedValue(barsUntil('2026-11-26'));
    clusters.findAll.mockResolvedValue([
      cluster({
        members: [clusterMember('AAA', { joinedAt: EVENING_OF_NOV_24_ET })],
      }),
    ]);

    await useCase.execute();

    expect(savedRows(tiers)).toEqual([
      [memberId('AAA'), '2026-11-24'],
      [memberId('AAA'), '2026-11-25'],
    ]);
  });

  it('should skip removed members and members who joined after the last completed session', async () => {
    clusters.findAll.mockResolvedValue([
      cluster({
        members: [
          clusterMember('AAA', {
            joinedAt: EVENING_OF_NOV_24_ET,
            removedAt: new Date('2026-11-25T15:00:00.000Z'),
          }),
          clusterMember('BBB', {
            joinedAt: new Date('2026-11-26T15:00:00.000Z'),
          }),
          clusterMember('CCC', { joinedAt: EVENING_OF_NOV_24_ET }),
        ],
      }),
    ]);

    await useCase.execute();

    expect(bars.dailyBarsSince).toHaveBeenCalledTimes(1);
    expect(savedRows(tiers)).toEqual([
      [memberId('CCC'), '2026-11-24'],
      [memberId('CCC'), '2026-11-25'],
    ]);
  });

  it('should fetch a ticker shared by two clusters once, from its earliest join', async () => {
    const otherClusterMemberId = memberId('AAA', 1);
    clusters.findAll.mockResolvedValue([
      cluster({
        members: [clusterMember('AAA', { joinedAt: EVENING_OF_NOV_24_ET })],
      }),
      cluster({
        id: ClusterId.of('33333333-3333-4333-8333-333333333333'),
        members: [
          clusterMember('AAA', {
            id: otherClusterMemberId,
            joinedAt: new Date('2026-11-20T15:00:00.000Z'),
          }),
        ],
      }),
    ]);

    await useCase.execute();

    expect(bars.dailyBarsSince).toHaveBeenNthCalledWith(
      1,
      Symbol.of('AAA'),
      SessionDate.of('2025-10-16'),
    );
    expect(bars.dailyBarsSince).toHaveBeenCalledTimes(1);
    expect(savedRows(tiers)).toEqual([
      [memberId('AAA'), '2026-11-24'],
      [memberId('AAA'), '2026-11-25'],
      [otherClusterMemberId, '2026-11-20'],
      [otherClusterMemberId, '2026-11-21'],
      [otherClusterMemberId, '2026-11-22'],
      [otherClusterMemberId, '2026-11-23'],
      [otherClusterMemberId, '2026-11-24'],
      [otherClusterMemberId, '2026-11-25'],
    ]);
  });

  it('should save the tickers that succeeded and report those missing the last session or failing to load', async () => {
    bars.dailyBarsSince.mockImplementation((ticker: Symbol) => {
      if (ticker.value === 'BBB')
        return Promise.resolve(barsUntil('2026-11-24'));
      if (ticker.value === 'CCC')
        return Promise.reject(new Error('Yahoo down'));
      return Promise.resolve(barsUntil(LAST_SESSION));
    });
    clusters.findAll.mockResolvedValue([
      cluster({
        members: ['AAA', 'BBB', 'CCC'].map((ticker) =>
          clusterMember(ticker, { joinedAt: EVENING_OF_NOV_24_ET }),
        ),
      }),
    ]);

    const result = await useCase.execute();

    expect(savedRows(tiers)).toEqual([
      [memberId('AAA'), '2026-11-24'],
      [memberId('AAA'), '2026-11-25'],
    ]);
    expect(result.failures).toEqual([
      'BBB: latest daily bar is 2026-11-24, expected 2026-11-25',
      'CCC: Yahoo down',
    ]);
  });
});
