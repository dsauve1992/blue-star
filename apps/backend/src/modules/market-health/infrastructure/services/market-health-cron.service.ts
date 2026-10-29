import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  CronJobNotificationService,
  NOTIFICATION_SERVICE,
  NotificationMessage,
  NotificationPriority,
  NotificationTitle,
  NotificationTopic,
  type NotificationService,
} from '../../../notification/notification.module';
import {
  MarketHealthStatus,
  MarketHealthStatusValue,
} from '../../domain/value-objects/market-health-status';
import { ComputeMarketHealthUseCase } from '../../use-cases/compute-market-health.use-case';
import { MARKET_TIMEZONE } from '../../../../shared/utils/market-clock';

@Injectable()
export class MarketHealthCronService {
  private readonly logger = new Logger(MarketHealthCronService.name);
  private readonly notificationTopic = NotificationTopic.of(
    'blue-star-market-health',
  );
  private readonly jobOptions = {
    jobName: 'Daily Market Health',
    jobType: 'market-health',
    frequency: 'daily',
  } as const;

  constructor(
    private readonly computeMarketHealthUseCase: ComputeMarketHealthUseCase,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('0 8 * * 1-5', { timeZone: MARKET_TIMEZONE })
  async computeMarketHealth(): Promise<void> {
    this.logger.log('Starting market health computation...');

    try {
      const marketHealth = await this.computeMarketHealthUseCase.execute();
      await this.sendNotification(
        marketHealth.status,
        marketHealth.ema9,
        marketHealth.ema21,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Market health computation failed: ${errorMessage}`);
      await this.cronJobNotificationService.notifyJobError(
        this.jobOptions,
        error,
      );
    }
  }

  private async sendNotification(
    status: MarketHealthStatus,
    ema9: number,
    ema21: number,
  ): Promise<void> {
    const statusEmoji: Record<MarketHealthStatusValue, string> = {
      [MarketHealthStatusValue.GOOD]: '📈',
      [MarketHealthStatusValue.WARNING]: '⚠️',
      [MarketHealthStatusValue.BAD]: '📉',
    };

    try {
      await this.notificationService.send({
        topic: this.notificationTopic,
        title: NotificationTitle.of(`Market Health: ${status.value}`),
        message: NotificationMessage.of(
          `SPY EMA9=${ema9.toFixed(2)}, EMA21=${ema21.toFixed(2)}`,
        ),
        priority:
          status.value === MarketHealthStatusValue.BAD
            ? NotificationPriority.HIGH
            : NotificationPriority.DEFAULT,
        tags: [statusEmoji[status.value], 'market-health'],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to send market health notification: ${errorMessage}`,
      );
    }
  }
}
