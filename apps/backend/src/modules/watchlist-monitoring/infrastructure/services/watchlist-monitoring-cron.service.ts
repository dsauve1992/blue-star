import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MonitoringType } from '../../domain/value-objects/monitoring-type';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { NotificationTopic } from '../../../notification/domain/value-objects/notification-topic';
import { NotificationMessage } from '../../../notification/domain/value-objects/notification-message';
import { NotificationTitle } from '../../../notification/domain/value-objects/notification-title';
import { NotificationPriority } from '../../../notification/domain/services/notification.service';
import type { WatchlistMonitoringReadRepository } from '../../domain/repositories/watchlist-monitoring-read.repository.interface';
import type { MonitoringAlertLogRepository } from '../../domain/repositories/monitoring-alert-log.repository.interface';
import type { WatchlistReadRepository } from '../../../watchlist/domain/repositories/watchlist-read.repository.interface';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import type { BreakoutDetectionService } from '../../domain/services/breakout-detection.service';
import type { NotificationService } from '../../../notification/domain/services/notification.service';
import { WATCHLIST_MONITORING_READ_REPOSITORY } from '../../constants/tokens';
import { BREAKOUT_DETECTION_SERVICE } from '../../constants/tokens';
import { MONITORING_ALERT_LOG_REPOSITORY } from '../../constants/tokens';
import { WATCHLIST_READ_REPOSITORY } from '../../../watchlist/constants/tokens';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';
import { NOTIFICATION_SERVICE } from '../../../notification/constants/tokens';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';

const MARKET_TIMEZONE = 'America/Toronto';

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
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
    @Inject(BREAKOUT_DETECTION_SERVICE)
    private readonly breakoutDetectionService: BreakoutDetectionService,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('*/5 * * * 1-5', { timeZone: 'America/Toronto' })
  async monitorBreakouts(): Promise<void> {
    if (!this.isWithinMarketHours()) {
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
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);

        const dateRange = DateRange.of(startDate, now);
        const symbol = Symbol.of(ticker.value);

        const historicalData = await this.marketDataService.getHistoricalData(
          symbol,
          dateRange,
          '1d',
        );

        const result = this.breakoutDetectionService.detect(
          ticker,
          historicalData,
        );

        const marketDate = this.getMarketDateKey();
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

  private getMarketDateKey(): string {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: MARKET_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const year = parts.find((p) => p.type === 'year')?.value ?? '';
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    return `${year}-${month}-${day}`;
  }

  private isWithinMarketHours(): boolean {
    const now = new Date();
    const torontoTime = new Date(
      now.toLocaleString('en-US', { timeZone: MARKET_TIMEZONE }),
    );

    const hours = torontoTime.getHours();
    const minutes = torontoTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM

    return totalMinutes >= marketOpen && totalMinutes <= marketClose;
  }
}
