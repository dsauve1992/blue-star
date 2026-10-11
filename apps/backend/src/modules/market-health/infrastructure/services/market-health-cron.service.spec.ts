import { MarketHealthCronService } from './market-health-cron.service';
import type { NotificationService } from '../../../notification/domain/services/notification.service';
import { NotificationPriority } from '../../../notification/domain/services/notification.service';
import { MarketHealth } from '../../domain/entities/market-health.entity';
import { MarketHealthStatus } from '../../domain/value-objects/market-health-status';
import type { ComputeMarketHealthUseCase } from '../../use-cases/compute-market-health.use-case';
import type { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';

describe('MarketHealthCronService', () => {
  let service: MarketHealthCronService;
  let computeUseCase: jest.Mocked<ComputeMarketHealthUseCase>;
  let notificationService: jest.Mocked<NotificationService>;
  let notifyJobError: jest.Mock;

  function marketHealthWith(status: MarketHealthStatus): MarketHealth {
    return MarketHealth.create({
      id: 'id',
      status,
      ema9: 101.5,
      ema21: 100.25,
      computedAt: new Date(),
    });
  }

  beforeEach(() => {
    computeUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue(marketHealthWith(MarketHealthStatus.good())),
    } as unknown as jest.Mocked<ComputeMarketHealthUseCase>;
    notificationService = { send: jest.fn().mockResolvedValue(undefined) };
    notifyJobError = jest.fn().mockResolvedValue(undefined);
    service = new MarketHealthCronService(computeUseCase, notificationService, {
      notifyJobError,
    } as unknown as CronJobNotificationService);
  });

  it('sends the status push on success', async () => {
    await service.computeMarketHealth();

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ priority: NotificationPriority.DEFAULT }),
    );
    expect(notifyJobError).not.toHaveBeenCalled();
  });

  it('sends a HIGH priority push when the status is BAD', async () => {
    computeUseCase.execute.mockResolvedValue(
      marketHealthWith(MarketHealthStatus.bad()),
    );

    await service.computeMarketHealth();

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ priority: NotificationPriority.HIGH }),
    );
  });

  it('does not throw when the push fails', async () => {
    notificationService.send.mockRejectedValue(new Error('ntfy down'));

    await expect(service.computeMarketHealth()).resolves.toBeUndefined();

    expect(notifyJobError).not.toHaveBeenCalled();
  });

  it('alerts and swallows a failed computation without pushing the status', async () => {
    const error = new Error('boom');
    computeUseCase.execute.mockRejectedValue(error);

    await expect(service.computeMarketHealth()).resolves.toBeUndefined();

    expect(notificationService.send).not.toHaveBeenCalled();
    expect(notifyJobError).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: 'Daily Market Health' }),
      error,
    );
  });
});
