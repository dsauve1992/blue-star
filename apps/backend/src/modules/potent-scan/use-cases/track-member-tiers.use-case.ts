import { Inject, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
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
import { computeMemberTiers } from '../domain/services/member-tier-calculator';
import { ClusterMember } from '../domain/entities/cluster';
import { MemberTier } from '../domain/value-objects/member-tier';
import { SessionDate } from '../domain/value-objects/session-date';
import { StateError } from '../domain/domain-errors';
import { getMarketDateKey } from '../../../shared/utils/market-clock';

const EMA_WARMUP_DAYS = 400;

export interface TrackMemberTiersResponseDto {
  sessionDate: SessionDate;
  tierCount: number;
  failures: string[];
}

@Injectable()
export class TrackMemberTiersUseCase {
  constructor(
    @Inject(SESSION_CALENDAR)
    private readonly sessionCalendar: SessionCalendar,
    @Inject(CLUSTER_REPOSITORY)
    private readonly clusterRepository: ClusterRepository,
    @Inject(DAILY_BAR_PROVIDER)
    private readonly dailyBarProvider: DailyBarProvider,
    @Inject(MEMBER_TIER_REPOSITORY)
    private readonly tierRepository: MemberTierRepository,
  ) {}

  async execute(): Promise<TrackMemberTiersResponseDto> {
    const sessionDate = await this.sessionCalendar.lastCompletedSession();
    const clusters = await this.clusterRepository.findAll('tracking');
    const membersByTicker = new Map<string, TrackedMember[]>();
    for (const member of clusters.flatMap((cluster) => cluster.members)) {
      const joinDate = joinSession(member);
      if (member.removedAt !== null || joinDate.value > sessionDate.value) {
        continue;
      }
      const tracked = membersByTicker.get(member.ticker.value) ?? [];
      tracked.push({ member, joinDate });
      membersByTicker.set(member.ticker.value, tracked);
    }

    const tiers: MemberTier[] = [];
    const failures: string[] = [];
    for (const [ticker, tracked] of membersByTicker) {
      try {
        const bars = await this.completedBars(tracked, sessionDate);
        for (const { member, joinDate } of tracked) {
          tiers.push(
            ...computeMemberTiers(member.id, bars, joinDate, sessionDate),
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${ticker}: ${message}`);
      }
    }

    await this.tierRepository.saveAll(tiers);
    return { sessionDate, tierCount: tiers.length, failures };
  }

  private async completedBars(
    tracked: TrackedMember[],
    sessionDate: SessionDate,
  ): Promise<DailyBar[]> {
    const earliestJoin = tracked
      .map(({ joinDate }) => joinDate.value)
      .sort()[0];
    const bars = (
      await this.dailyBarProvider.dailyBarsSince(
        tracked[0].member.ticker,
        warmupStart(earliestJoin),
      )
    ).filter((bar) => bar.date.value <= sessionDate.value);
    const latest = bars.at(-1)?.date.value;
    if (latest !== sessionDate.value) {
      throw new StateError(
        `latest daily bar is ${latest ?? 'missing'}, expected ${sessionDate.value}`,
      );
    }
    return bars;
  }
}

interface TrackedMember {
  member: ClusterMember;
  joinDate: SessionDate;
}

function joinSession(member: ClusterMember): SessionDate {
  return SessionDate.of(getMarketDateKey(member.joinedAt));
}

function warmupStart(joinDate: string): SessionDate {
  return SessionDate.of(
    DateTime.fromISO(joinDate, { zone: 'utc' })
      .minus({ days: EMA_WARMUP_DAYS })
      .toFormat('yyyy-LL-dd'),
  );
}
