import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MonitoringType } from '../../domain/value-objects/monitoring-type';
import {
  WatchlistId,
  FindWatchlistTickersUseCase,
} from '../../../watchlist/watchlist.module';
import {
  CronJobNotificationService,
  NOTIFICATION_SERVICE,
  NotificationMessage,
  NotificationPriority,
  NotificationTitle,
  NotificationTopic,
  type NotificationService,
} from '../../../notification/notification.module';
import type { WatchlistMonitoringReadRepository } from '../../domain/repositories/watchlist-monitoring-read.repository.interface';
import type { MonitoringAlertLogRepository } from '../../domain/repositories/monitoring-alert-log.repository.interface';
import type { BreakoutDetectionService } from '../../domain/services/breakout-detection.service';
import type { IGapDetectionService } from '../../domain/services/i-gap-detection.service';
import { WATCHLIST_MONITORING_READ_REPOSITORY } from '../../constants/tokens';
import { BREAKOUT_DETECTION_SERVICE } from '../../constants/tokens';
import { GAP_DETECTION_SERVICE } from '../../constants/tokens';
import { MONITORING_ALERT_LOG_REPOSITORY } from '../../constants/tokens';
import {
  getMarketDateKey,
  isWithinMarketHours,
  marketToday,
} from './market-time.util';
import { MARKET_TIMEZONE } from '../../../../shared/utils/market-clock';

export interface GapScanSummary {
  watchlists: number;
  failedWatchlists: number;
  checkedTickers: number;
  failedTickers: number;
  firstError?: unknown;
}

@Injectable()
export class WatchlistMonitoringCronService {
  private readonly logger = new Logger(WatchlistMonitoringCronService.name);
  private readonly breakoutTopic = NotificationTopic.of('blue-star-breakout');
  private readonly gapTopic = NotificationTopic.of('blue-star-gap');
  private readonly gapJobOptions = {
    jobName: 'Watchlist Gap Monitoring',
    jobType: 'gap',
    frequency: 'daily',
  } as const;

  constructor(
    @Inject(WATCHLIST_MONITORING_READ_REPOSITORY)
    private readonly monitoringReadRepository: WatchlistMonitoringReadRepository,
    @Inject(MONITORING_ALERT_LOG_REPOSITORY)
    private readonly monitoringAlertLogRepository: MonitoringAlertLogRepository,
    private readonly findWatchlistTickers: FindWatchlistTickersUseCase,
    @Inject(BREAKOUT_DETECTION_SERVICE)
    private readonly breakoutDetectionService: BreakoutDetectionService,
    @Inject(GAP_DETECTION_SERVICE)
    private readonly gapDetectionService: IGapDetectionService,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('*/5 * * * 1-5', { timeZone: MARKET_TIMEZONE })
  async monitorBreakouts(): Promise<void> {
    if (!isWithinMarketHours()) {
      return;
    }

    const jobName = 'Watchlist Breakout Monitoring';
    this.logger.log(`Starting ${jobName}...`);

    try {
      const activeMonitorings =
        await this.monitoringReadRepository.findAllActiveByType(
          MonitoringType.BREAKOUT,
        );

      this.logger.log(
        `Found ${activeMonitorings.length} active breakout monitorings`,
      );

      for (const monitoring of activeMonitorings) {
        try {
          await this.processMonitoring(monitoring.watchlistId);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to process watchlist ${monitoring.watchlistId.value}: ${errorMessage}`,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`${jobName} failed: ${errorMessage}`);
    }
  }

  private async processMonitoring(watchlistId: WatchlistId): Promise<void> {
    const watchlist = await this.findWatchlistTickers.execute(watchlistId);

    if (!watchlist) {
      this.logger.warn(
        `Watchlist ${watchlistId.value} not found, skipping monitoring`,
      );
      return;
    }

    for (const ticker of watchlist.tickers) {
      try {
        const result = await this.breakoutDetectionService.detect(ticker);

        const marketDate = getMarketDateKey();
        if (
          result.detected &&
          !(await this.monitoringAlertLogRepository.hasAlerted(
            ticker.value,
            marketDate,
            MonitoringType.BREAKOUT,
          ))
        ) {
          await this.sendBreakoutAlert(ticker.value, watchlist.name);
          await this.monitoringAlertLogRepository.recordAlert(
            ticker.value,
            marketDate,
            MonitoringType.BREAKOUT,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to check breakout for ${ticker.value}: ${errorMessage}`,
        );
      }
    }
  }

  private async sendBreakoutAlert(
    ticker: string,
    watchlistName: string,
  ): Promise<void> {
    await this.notificationService.send({
      topic: this.breakoutTopic,
      title: NotificationTitle.of(`Breakout Alert: ${ticker}`),
      message: NotificationMessage.of(
        `${ticker} from watchlist "${watchlistName}" is breaking out!`,
      ),
      priority: NotificationPriority.HIGH,
      tags: ['📈', 'breakout', ticker],
    });

    this.logger.log(`Breakout alert sent for ${ticker}`);
  }

  @Cron('45 9 * * 1-5', { timeZone: MARKET_TIMEZONE })
  async monitorGaps(): Promise<void> {
    try {
      const summary = await this.scanGaps();
      if (summary.failedTickers > 0 || summary.failedWatchlists > 0) {
        await this.cronJobNotificationService.notifyJobError(
          this.gapJobOptions,
          new Error(this.describeGapScanFailures(summary)),
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Watchlist Gap Monitoring failed: ${errorMessage}`);
      await this.cronJobNotificationService.notifyJobError(
        this.gapJobOptions,
        error,
      );
    }
  }

  private describeGapScanFailures(summary: GapScanSummary): string {
    const firstMessage =
      summary.firstError instanceof Error
        ? summary.firstError.message
        : 'Unknown error';
    const parts: string[] = [];
    if (summary.failedTickers > 0) {
      parts.push(
        `${summary.failedTickers} of ${summary.checkedTickers} tickers could not be checked`,
      );
    }
    if (summary.failedWatchlists > 0) {
      parts.push(
        `${summary.failedWatchlists} of ${summary.watchlists} watchlists could not be loaded`,
      );
    }
    return `${parts.join('; ')}: ${firstMessage}`;
  }

  async scanGaps(): Promise<GapScanSummary> {
    this.logger.log('Starting Watchlist Gap Monitoring...');

    const activeMonitorings =
      await this.monitoringReadRepository.findAllActiveByType(
        MonitoringType.GAP,
      );

    this.logger.log(`Found ${activeMonitorings.length} active gap monitorings`);

    const summary: GapScanSummary = {
      watchlists: activeMonitorings.length,
      failedWatchlists: 0,
      checkedTickers: 0,
      failedTickers: 0,
    };
    for (const monitoring of activeMonitorings) {
      try {
        const result = await this.processGapMonitoring(monitoring.watchlistId);
        summary.checkedTickers += result.checked;
        summary.failedTickers += result.failed;
        summary.firstError ??= result.firstError;
      } catch (error) {
        summary.failedWatchlists++;
        summary.firstError ??= error;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to process watchlist ${monitoring.watchlistId.value}: ${errorMessage}`,
        );
      }
    }
    return summary;
  }

  private async processGapMonitoring(
    watchlistId: WatchlistId,
  ): Promise<{ checked: number; failed: number; firstError?: unknown }> {
    const watchlist = await this.findWatchlistTickers.execute(watchlistId);

    if (!watchlist) {
      this.logger.warn(
        `Watchlist ${watchlistId.value} not found, skipping gap monitoring`,
      );
      return { checked: 0, failed: 0 };
    }

    let failed = 0;
    let firstError: unknown;
    for (const ticker of watchlist.tickers) {
      try {
        const result = await this.gapDetectionService.detect(ticker);

        const detectedAt = new Date();
        const marketDate = marketToday(detectedAt);
        if (
          result.detected &&
          result.entryPrice !== undefined &&
          result.stopPrice !== undefined &&
          !(await this.monitoringAlertLogRepository.hasAlerted(
            ticker.value,
            marketDate.key,
            MonitoringType.GAP,
          ))
        ) {
          await this.sendGapAlert(ticker.value, watchlist.name);
          await this.monitoringAlertLogRepository.recordAlert(
            ticker.value,
            marketDate.key,
            MonitoringType.GAP,
          );
        }
      } catch (error) {
        failed++;
        firstError ??= error;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to check gap for ${ticker.value}: ${errorMessage}`,
        );
      }
    }

    return { checked: watchlist.tickers.length, failed, firstError };
  }

  private async sendGapAlert(
    ticker: string,
    watchlistName: string,
  ): Promise<void> {
    await this.notificationService.send({
      topic: this.gapTopic,
      title: NotificationTitle.of(`Gap Alert: ${ticker}`),
      message: NotificationMessage.of(
        `${ticker} from watchlist "${watchlistName}" is gapping up!`,
      ),
      priority: NotificationPriority.HIGH,
      tags: ['🚀', 'gap', ticker],
    });

    this.logger.log(`Gap alert sent for ${ticker}`);
  }
}
