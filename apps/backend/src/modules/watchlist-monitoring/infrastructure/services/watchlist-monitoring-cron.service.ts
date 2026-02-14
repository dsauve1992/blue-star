import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MonitoringType } from '../../domain/value-objects/monitoring-type';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { NotificationTopic } from '../../../notification/domain/value-objects/notification-topic';
import { NotificationMessage } from '../../../notification/domain/value-objects/notification-message';
import { NotificationTitle } from '../../../notification/domain/value-objects/notification-title';
import { NotificationPriority } from '../../../notification/domain/services/notification.service';
import type { WatchlistMonitoringReadRepository } from '../../domain/repositories/watchlist-monitoring-read.repository.interface';
import type { MonitoringAlertLogRepository } from '../../domain/repositories/monitoring-alert-log.repository.interface';
import type { WatchlistReadRepository } from '../../../watchlist/domain/repositories/watchlist-read.repository.interface';
import type { BreakoutDetectionService } from '../../domain/services/breakout-detection.service';
import type { NotificationService } from '../../../notification/domain/services/notification.service';
import { WATCHLIST_MONITORING_READ_REPOSITORY } from '../../constants/tokens';
import { BREAKOUT_DETECTION_SERVICE } from '../../constants/tokens';
import { MONITORING_ALERT_LOG_REPOSITORY } from '../../constants/tokens';
import { WATCHLIST_READ_REPOSITORY } from '../../../watchlist/constants/tokens';
import { NOTIFICATION_SERVICE } from '../../../notification/constants/tokens';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';
import { getMarketDateKey, isWithinMarketHours } from './market-time.util';

@Injectable()
export class WatchlistMonitoringCronService {
  private readonly logger = new Logger(WatchlistMonitoringCronService.name);
  private readonly breakoutTopic = NotificationTopic.of('blue-star-breakout');

  constructor(
    @Inject(WATCHLIST_MONITORING_READ_REPOSITORY)
    private readonly monitoringReadRepository: WatchlistMonitoringReadRepository,
    @Inject(MONITORING_ALERT_LOG_REPOSITORY)
    private readonly monitoringAlertLogRepository: MonitoringAlertLogRepository,
    @Inject(WATCHLIST_READ_REPOSITORY)
    private readonly watchlistReadRepository: WatchlistReadRepository,
    @Inject(BREAKOUT_DETECTION_SERVICE)
    private readonly breakoutDetectionService: BreakoutDetectionService,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('*/5 * * * 1-5', { timeZone: 'America/Toronto' })
  async monitorBreakouts(): Promise<void> {
    if (!isWithinMarketHours()) {
      return;
    }

    const jobName = 'Watchlist Breakout Monitoring';
    this.logger.log(`Starting ${jobName}...`);

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'breakout-monitoring',
      frequency: 'intraday',
    });

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

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'breakout-monitoring',
        frequency: 'intraday',
        additionalData: `${activeMonitorings.length} watchlists checked`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`${jobName} failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(
        {
          jobName,
          jobType: 'breakout-monitoring',
          frequency: 'intraday',
        },
        error,
      );
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
}
