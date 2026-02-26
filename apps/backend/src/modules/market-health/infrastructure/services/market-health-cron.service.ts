import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import type { NotificationService } from '../../../notification/domain/services/notification.service';
import { NotificationPriority } from '../../../notification/domain/services/notification.service';
import { NotificationTopic } from '../../../notification/domain/value-objects/notification-topic';
import { NotificationTitle } from '../../../notification/domain/value-objects/notification-title';
import { NotificationMessage } from '../../../notification/domain/value-objects/notification-message';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import type { MarketHealthRepository } from '../../domain/repositories/market-health.repository.interface';
import { MarketHealth } from '../../domain/entities/market-health.entity';
import {
  MarketHealthStatus,
  MarketHealthStatusValue,
} from '../../domain/value-objects/market-health-status';
import { MARKET_HEALTH_REPOSITORY } from '../../constants/tokens';
import { MARKET_DATA_SERVICE } from '../../../market-data/market-data.module';
import { NOTIFICATION_SERVICE } from '../../../notification/constants/tokens';

@Injectable()
export class MarketHealthCronService {
  private readonly logger = new Logger(MarketHealthCronService.name);
  private readonly spySymbol = Symbol.of('SPY');
  private readonly notificationTopic = NotificationTopic.of(
    'blue-star-market-health',
  );

  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
    @Inject(MARKET_HEALTH_REPOSITORY)
    private readonly marketHealthRepository: MarketHealthRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 8 * * 1-5', { timeZone: 'America/Toronto' })
  async computeMarketHealth(): Promise<void> {
    this.logger.log('Starting market health computation...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const dateRange = DateRange.of(ninetyDaysAgo, yesterday);
      const historicalData = await this.marketDataService.getHistoricalData(
        this.spySymbol,
        dateRange,
        '1d',
      );

      const closes = historicalData.pricePoints
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((p) => p.close);

      if (closes.length < 22) {
        this.logger.warn(
          `Not enough data points to compute EMAs: ${closes.length}`,
        );
        return;
      }

      const ema9Values = this.computeEma(closes, 9);
      const ema21Values = this.computeEma(closes, 21);

      const lastIdx = ema9Values.length - 1;
      const prevIdx = lastIdx - 1;

      const currentEma9 = ema9Values[lastIdx];
      const previousEma9 = ema9Values[prevIdx];
      const currentEma21 = ema21Values[lastIdx];
      const previousEma21 = ema21Values[prevIdx];

      const status = this.deriveStatus(
        currentEma9,
        previousEma9,
        currentEma21,
        previousEma21,
      );

      const marketHealth = MarketHealth.create({
        id: randomUUID(),
        status,
        ema9: Math.round(currentEma9 * 10000) / 10000,
        ema21: Math.round(currentEma21 * 10000) / 10000,
        computedAt: new Date(),
      });

      await this.marketHealthRepository.save(marketHealth);
      this.logger.log(
        `Market health computed: ${status.value} (EMA9=${currentEma9.toFixed(2)}, EMA21=${currentEma21.toFixed(2)})`,
      );

      await this.sendNotification(status, currentEma9, currentEma21);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Market health computation failed: ${errorMessage}`);
    }
  }

  private computeEma(closes: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const emaValues: number[] = [];

    let ema =
      closes.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    emaValues.push(ema);

    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * multiplier + ema * (1 - multiplier);
      emaValues.push(ema);
    }

    return emaValues;
  }

  private deriveStatus(
    currentEma9: number,
    previousEma9: number,
    currentEma21: number,
    previousEma21: number,
  ): MarketHealthStatus {
    if (currentEma9 <= currentEma21) {
      return MarketHealthStatus.bad();
    }

    const ema9Rising = currentEma9 > previousEma9;
    const ema21Rising = currentEma21 > previousEma21;

    if (ema9Rising && ema21Rising) {
      return MarketHealthStatus.good();
    }

    return MarketHealthStatus.warning();
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
