import { MarketHealthCronService } from './market-health-cron.service';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import type { NotificationService } from '../../../notification/domain/services/notification.service';
import { NotificationPriority } from '../../../notification/domain/services/notification.service';
import type { MarketHealthRepository } from '../../domain/repositories/market-health.repository.interface';
import type { MarketHealth } from '../../domain/entities/market-health.entity';
import { MarketHealthStatusValue } from '../../domain/value-objects/market-health-status';
import type { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';

describe('MarketHealthCronService', () => {
  let service: MarketHealthCronService;
  let marketDataService: jest.Mocked<MarketDataService>;
  let marketHealthRepository: jest.Mocked<MarketHealthRepository>;
  let notificationService: jest.Mocked<NotificationService>;
  let notifyJobError: jest.Mock;

  const rising = Array.from({ length: 30 }, (_, i) => 100 + i);
  const falling = Array.from({ length: 30 }, (_, i) => 130 - i);
  const risingThenDip = [...rising.slice(0, 29), 120];

  function pricePointsFrom(closes: number[]): PricePoint[] {
    return closes.map((close, i) =>
      PricePoint.of(
        new Date(Date.UTC(2026, 0, 1 + i)),
        close,
        close,
        close,
        close,
        1000,
      ),
    );
  }

  function givenCloses(closes: number[]) {
    marketDataService.getHistoricalData.mockResolvedValue({
      pricePoints: pricePointsFrom(closes),
    } as never);
  }

  function savedHealth(): MarketHealth {
    return marketHealthRepository.save.mock.calls[0][0];
  }

  beforeEach(() => {
    marketDataService = { getHistoricalData: jest.fn() };
    marketHealthRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findLatest: jest.fn(),
    };
    notificationService = { send: jest.fn().mockResolvedValue(undefined) };
    notifyJobError = jest.fn().mockResolvedValue(undefined);
    service = new MarketHealthCronService(
      marketDataService,
      marketHealthRepository,
      notificationService,
      { notifyJobError } as unknown as CronJobNotificationService,
    );
  });

  it('saves GOOD when EMA9 is above EMA21 and both are rising', async () => {
    givenCloses(rising);

    await service.computeMarketHealth();

    expect(savedHealth().status.value).toBe(MarketHealthStatusValue.GOOD);
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ priority: NotificationPriority.DEFAULT }),
    );
    expect(notifyJobError).not.toHaveBeenCalled();
  });

  it('saves WARNING when EMA9 is above EMA21 but EMA9 is falling', async () => {
    givenCloses(risingThenDip);

    await service.computeMarketHealth();

    const health = savedHealth();
    expect(health.status.value).toBe(MarketHealthStatusValue.WARNING);
    expect(health.ema9).toBeGreaterThan(health.ema21);
  });

  it('saves BAD and sends a HIGH priority notification when EMA9 is at or below EMA21', async () => {
    givenCloses(falling);

    await service.computeMarketHealth();

    expect(savedHealth().status.value).toBe(MarketHealthStatusValue.BAD);
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ priority: NotificationPriority.HIGH }),
    );
  });

  it('alerts and saves nothing with fewer than 22 price points', async () => {
    givenCloses(rising.slice(0, 21));

    await service.computeMarketHealth();

    expect(marketHealthRepository.save).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
    expect(notifyJobError).toHaveBeenCalledTimes(1);
    expect(notifyJobError).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: 'Daily Market Health' }),
      new Error('Not enough data points to compute EMAs: 21'),
    );
  });

  it('computes from 22 price points', async () => {
    givenCloses(rising.slice(0, 22));

    await service.computeMarketHealth();

    expect(marketHealthRepository.save).toHaveBeenCalledTimes(1);
  });

  it('gives the same result for unsorted price points', async () => {
    givenCloses(rising);
    await service.computeMarketHealth();
    const sortedResult = savedHealth();

    marketHealthRepository.save.mockClear();
    marketDataService.getHistoricalData.mockResolvedValue({
      pricePoints: pricePointsFrom(rising).reverse(),
    } as never);
    await service.computeMarketHealth();

    expect(savedHealth().status.value).toBe(sortedResult.status.value);
    expect(savedHealth().ema9).toBe(sortedResult.ema9);
    expect(savedHealth().ema21).toBe(sortedResult.ema21);
  });

  it('rounds the saved EMAs to 4 decimals', async () => {
    givenCloses(rising.map((close) => close + 1 / 3));

    await service.computeMarketHealth();

    const { ema9, ema21 } = savedHealth();
    expect(Math.round(ema9 * 10000) / 10000).toBe(ema9);
    expect(Math.round(ema21 * 10000) / 10000).toBe(ema21);
  });

  it('still saves and does not throw when the notification fails', async () => {
    givenCloses(falling);
    notificationService.send.mockRejectedValue(new Error('ntfy down'));

    await expect(service.computeMarketHealth()).resolves.toBeUndefined();

    expect(marketHealthRepository.save).toHaveBeenCalledTimes(1);
  });

  it('alerts and swallows market data failures without saving', async () => {
    const error = new Error('boom');
    marketDataService.getHistoricalData.mockRejectedValue(error);

    await expect(service.computeMarketHealth()).resolves.toBeUndefined();

    expect(marketHealthRepository.save).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
    expect(notifyJobError).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: 'Daily Market Health' }),
      error,
    );
  });
});
