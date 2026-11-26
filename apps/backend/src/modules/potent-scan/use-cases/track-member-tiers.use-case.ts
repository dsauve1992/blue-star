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
import {
  computeMemberTiers,
  joinSession,
  lastClosedDateAt,
} from '../domain/services/member-tier-calculator';
import { ClusterMember } from '../domain/entities/cluster';
import { MemberTier } from '../domain/value-objects/member-tier';
import { SessionDate } from '../domain/value-objects/session-date';
import { StateError } from '../domain/domain-errors';

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
    const membersByTicker = new Map<string, ClusterMember[]>();
    for (const member of clusters.flatMap((cluster) => cluster.members)) {
      if (member.removedAt !== null) continue;
      const tracked = membersByTicker.get(member.ticker.value) ?? [];
      tracked.push(member);
      membersByTicker.set(member.ticker.value, tracked);
    }

    const tiers: MemberTier[] = [];
    const failures: string[] = [];
    for (const [ticker, tracked] of membersByTicker) {
      try {
        const bars = await this.completedBars(tracked, sessionDate);
        for (const member of tracked) {
          tiers.push(
            ...computeMemberTiers(
              member.id,
              bars,
              joinSession(member.joinedAt, bars),
              sessionDate,
            ),
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
    tracked: ClusterMember[],
    sessionDate: SessionDate,
  ): Promise<DailyBar[]> {
    const earliestJoin = tracked
      .map((member) => lastClosedDateAt(member.joinedAt).value)
      .sort()[0];
    const bars = (
      await this.dailyBarProvider.dailyBarsSince(
        tracked[0].ticker,
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

function warmupStart(joinDate: string): SessionDate {
  return SessionDate.of(
    DateTime.fromISO(joinDate, { zone: 'utc' })
      .minus({ days: EMA_WARMUP_DAYS })
      .toFormat('yyyy-LL-dd'),
  );
}
