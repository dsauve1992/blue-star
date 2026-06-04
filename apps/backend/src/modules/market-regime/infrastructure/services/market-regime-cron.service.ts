import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import type { RsRatingRepository } from '../../../stock-analysis/domain/repositories/rs-rating.repository.interface';
import type { MarketHealthRepository } from '../../../market-health/domain/repositories/market-health.repository.interface';
import { MarketHealthStatusValue } from '../../../market-health/domain/value-objects/market-health-status';
import { RS_RATING_REPOSITORY } from '../../../stock-analysis/constants/tokens';
import { MARKET_HEALTH_REPOSITORY } from '../../../market-health/constants/tokens';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';
import type { LeaderBreadthRepository } from '../../domain/repositories/leader-breadth.repository.interface';
import type { MarketRegimeRepository } from '../../domain/repositories/market-regime.repository.interface';
import {
  LEADER_BREADTH_REPOSITORY,
  MARKET_REGIME_REPOSITORY,
} from '../../constants/tokens';
import { LeaderBreadthSnapshot } from '../../domain/entities/leader-breadth-snapshot.entity';
import { MarketRegime } from '../../domain/entities/market-regime.entity';
import { BreadthSignal } from '../../domain/value-objects/breadth-signal';
import { RegimeState } from '../../domain/value-objects/regime-state';

@Injectable()
export class MarketRegimeCronService {
  private readonly logger = new Logger(MarketRegimeCronService.name);

  // RS rating at or above this value qualifies a stock as a "leader".
  private readonly RS_LEADER_THRESHOLD = 90;
  // Number of trailing snapshots used to compute the leader-count moving average.
  private readonly MA_WINDOW = 20;

  constructor(
    @Inject(RS_RATING_REPOSITORY)
    private readonly rsRatingRepository: RsRatingRepository,
    @Inject(MARKET_HEALTH_REPOSITORY)
    private readonly marketHealthRepository: MarketHealthRepository,
    @Inject(LEADER_BREADTH_REPOSITORY)
    private readonly leaderBreadthRepository: LeaderBreadthRepository,
    @Inject(MARKET_REGIME_REPOSITORY)
    private readonly marketRegimeRepository: MarketRegimeRepository,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('0 19 * * 1-5', { timeZone: 'America/Toronto' })
  async computeRegime(): Promise<void> {
    const jobName = 'Daily Market Regime Computation';
    this.logger.log(`Starting ${jobName}...`);

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'market-regime',
      frequency: 'daily',
    });

    try {
      const ratings = await this.rsRatingRepository.getAllForLatestDate();
      const totalUniverse = ratings.length;

      if (totalUniverse === 0) {
        this.logger.warn(
          'No RS ratings available — cannot compute leader breadth',
        );
        await this.cronJobNotificationService.notifyJobError(
          {
            jobName,
            jobType: 'market-regime',
            frequency: 'daily',
          },
          new Error('No RS ratings available — cannot compute leader breadth'),
        );
        return;
      }

      const leaderCount = ratings.filter(
        (r) => r.rsRating >= this.RS_LEADER_THRESHOLD,
      ).length;

      const snapshot = LeaderBreadthSnapshot.create({
        id: randomUUID(),
        leaderCount,
        totalUniverse,
        rsThreshold: this.RS_LEADER_THRESHOLD,
        computedAt: new Date(),
      });
      await this.leaderBreadthRepository.save(snapshot);

      // findRecent now includes today's just-saved row.
      const recent = await this.leaderBreadthRepository.findRecent(
        this.MA_WINDOW,
      );
      const leaderCountMa =
        recent.length > 0
          ? Math.round(
              recent.reduce((sum, x) => sum + x.leaderCount, 0) / recent.length,
            )
          : leaderCount;

      const breadthSignal = BreadthSignal.deriveFrom(
        leaderCount,
        leaderCountMa,
      );

      const marketHealth = await this.marketHealthRepository.findLatest();
      // Default to WARNING if market-health hasn't computed yet — neutral-ish,
      // never falsely GREEN.
      const mhStatus = marketHealth
        ? marketHealth.status.value
        : MarketHealthStatusValue.WARNING;

      const state = RegimeState.deriveFrom(mhStatus, breadthSignal.value);

      const regime = MarketRegime.create({
        id: randomUUID(),
        state,
        marketHealthStatus: mhStatus,
        leaderCount,
        leaderCountMa,
        breadthSignal,
        computedAt: new Date(),
      });
      await this.marketRegimeRepository.save(regime);

      this.logger.log(
        `Market regime computed: ${state.value} ` +
          `(leaders=${leaderCount}/${leaderCountMa}, ` +
          `breadth=${breadthSignal.value}, marketHealth=${mhStatus})`,
      );

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'market-regime',
        frequency: 'daily',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Market regime computation failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(
        {
          jobName,
          jobType: 'market-regime',
          frequency: 'daily',
        },
        error,
      );
    }
  }
}
