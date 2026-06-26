import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MonitoringType } from '../../domain/value-objects/monitoring-type';
import { GapDetectedEvent } from '../../domain/events/gap-detected.event';
import { GapContext } from '../../domain/value-objects/gap-context';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { NotificationTopic } from '../../../notification/domain/value-objects/notification-topic';
import { NotificationMessage } from '../../../notification/domain/value-objects/notification-message';
import { NotificationTitle } from '../../../notification/domain/value-objects/notification-title';
import { NotificationPriority } from '../../../notification/domain/services/notification.service';
import type { WatchlistMonitoringReadRepository } from '../../domain/repositories/watchlist-monitoring-read.repository.interface';
import type { MonitoringAlertLogRepository } from '../../domain/repositories/monitoring-alert-log.repository.interface';
import type { WatchlistReadRepository } from '../../../watchlist/domain/repositories/watchlist-read.repository.interface';
import type { BreakoutDetectionService } from '../../domain/services/breakout-detection.service';
import type { IGapDetectionService } from '../../domain/services/i-gap-detection.service';
import type { NotificationService } from '../../../notification/domain/services/notification.service';
import { WATCHLIST_MONITORING_READ_REPOSITORY } from '../../constants/tokens';
import { BREAKOUT_DETECTION_SERVICE } from '../../constants/tokens';
import { GAP_DETECTION_SERVICE } from '../../constants/tokens';
import { MONITORING_ALERT_LOG_REPOSITORY } from '../../constants/tokens';
import { WATCHLIST_READ_REPOSITORY } from '../../../watchlist/constants/tokens';
import { NOTIFICATION_SERVICE } from '../../../notification/constants/tokens';
import {
  getMarketDateKey,
  isWithinMarketHours,
  marketToday,
} from './market-time.util';

@Injectable()
export class WatchlistMonitoringCronService {
  private readonly logger = new Logger(WatchlistMonitoringCronService.name);
  private readonly breakoutTopic = NotificationTopic.of('blue-star-breakout');
  private readonly gapTopic = NotificationTopic.of('blue-star-gap');

  constructor(
    @Inject(WATCHLIST_MONITORING_READ_REPOSITORY)
    private readonly monitoringReadRepository: WatchlistMonitoringReadRepository,
    @Inject(MONITORING_ALERT_LOG_REPOSITORY)
    private readonly monitoringAlertLogRepository: MonitoringAlertLogRepository,
    @Inject(WATCHLIST_READ_REPOSITORY)
    private readonly watchlistReadRepository: WatchlistReadRepository,
    @Inject(BREAKOUT_DETECTION_SERVICE)
    private readonly breakoutDetectionService: BreakoutDetectionService,
    @Inject(GAP_DETECTION_SERVICE)
    private readonly gapDetectionService: IGapDetectionService,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/5 * * * 1-5', { timeZone: 'America/Toronto' })
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
        await this.processMonitoring(monitoring.watchlistId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`${jobName} failed: ${errorMessage}`);
    }
  }

  private async processMonitoring(watchlistId: WatchlistId): Promise<void> {
    const watchlist = await this.watchlistReadRepository.findById(watchlistId);

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
          await this.sendBreakoutAlert(ticker.value, watchlist.name.value);
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
    try {
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to send breakout alert for ${ticker}: ${errorMessage}`,
      );
    }
  }

  @Cron('45 9 * * 1-5', { timeZone: 'America/Toronto' })
  async monitorGaps(): Promise<void> {
    const jobName = 'Watchlist Gap Monitoring';
    this.logger.log(`Starting ${jobName}...`);

    try {
      const activeMonitorings =
        await this.monitoringReadRepository.findAllActiveByType(
          MonitoringType.GAP,
        );

      this.logger.log(
        `Found ${activeMonitorings.length} active gap monitorings`,
      );

      for (const monitoring of activeMonitorings) {
        await this.processGapMonitoring(monitoring.watchlistId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`${jobName} failed: ${errorMessage}`);
    }
  }

  private async processGapMonitoring(watchlistId: WatchlistId): Promise<void> {
    const watchlist = await this.watchlistReadRepository.findById(watchlistId);

    if (!watchlist) {
      this.logger.warn(
        `Watchlist ${watchlistId.value} not found, skipping gap monitoring`,
      );
      return;
    }

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
          await this.sendGapAlert(ticker.value, watchlist.name.value);
          await this.monitoringAlertLogRepository.recordAlert(
            ticker.value,
            marketDate.key,
            MonitoringType.GAP,
          );

          const context = result.context ?? GapContext.none();
          this.eventEmitter.emit(
            GapDetectedEvent.NAME,
            new GapDetectedEvent(
              ticker,
              watchlist.id,
              watchlist.name.value,
              marketDate,
              detectedAt,
              result.entryPrice,
              result.stopPrice,
              context.industryGroup,
              context.globalRsRating,
              context.industryGroupRsRating,
              context.industryGroupQuadrant,
            ),
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to check gap for ${ticker.value}: ${errorMessage}`,
        );
      }
    }
  }

  private async sendGapAlert(
    ticker: string,
    watchlistName: string,
  ): Promise<void> {
    try {
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to send gap alert for ${ticker}: ${errorMessage}`,
      );
    }
  }
}
