import { Test, TestingModule } from '@nestjs/testing';
import { WatchlistMonitoringController } from './watchlist-monitoring.controller';
import { WatchlistMonitoringApiMapper } from './watchlist-monitoring-api.mapper';
import { ActivateMonitoringUseCase } from '../use-cases/activate-monitoring.use-case';
import { DeactivateMonitoringUseCase } from '../use-cases/deactivate-monitoring.use-case';
import { GetMonitoringStatusUseCase } from '../use-cases/get-monitoring-status.use-case';
import { WatchlistMonitoringCronService } from '../infrastructure/services/watchlist-monitoring-cron.service';

describe('WatchlistMonitoringController', () => {
  let controller: WatchlistMonitoringController;
  let cronService: jest.Mocked<
    Pick<WatchlistMonitoringCronService, 'monitorGaps'>
  >;

  beforeEach(async () => {
    cronService = {
      monitorGaps: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WatchlistMonitoringController],
      providers: [
        { provide: ActivateMonitoringUseCase, useValue: {} },
        { provide: DeactivateMonitoringUseCase, useValue: {} },
        { provide: GetMonitoringStatusUseCase, useValue: {} },
        { provide: WatchlistMonitoringApiMapper, useValue: {} },
        { provide: WatchlistMonitoringCronService, useValue: cronService },
      ],
    }).compile();

    controller = module.get(WatchlistMonitoringController);
  });

  describe('runGapScan', () => {
    it('delegates to the cron gap-monitoring job and reports completion', async () => {
      const result = await controller.runGapScan();

      expect(cronService.monitorGaps).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'completed' });
    });
  });
});
