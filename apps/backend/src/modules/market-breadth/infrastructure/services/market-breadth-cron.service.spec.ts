import { MarketBreadthCronService } from './market-breadth-cron.service';
import type { CronJobNotificationService } from '../../../notification/notification.module';
import { MarketBreadthAggregate } from '../../domain/entities/market-breadth-aggregate';
import type {
  MarketBreadthAnalysisService,
  MarketBreadthRunResult,
} from '../../domain/services/market-breadth-analysis.service';
import { BreadthDate } from '../../domain/value-objects/breadth-date';

describe('MarketBreadthCronService', () => {
  let service: MarketBreadthCronService;
  let analysisService: jest.Mocked<MarketBreadthAnalysisService>;
  let notifyJobStart: jest.Mock;
  let notifyJobSuccess: jest.Mock;
  let notifyJobError: jest.Mock<Promise<void>, [unknown, Error]>;

  function aggregateOn(isoDate: string): MarketBreadthAggregate {
    return MarketBreadthAggregate.create({
      date: BreadthDate.fromISOString(isoDate),
      universeSize: 1500,
      newHighs: 42,
      newLows: 7,
      newHighs20: null,
      newLows20: null,
      stackedCount: null,
      missingSymbols: [],
      partial: false,
      backfilled: false,
    });
  }

  function runResult(
    overrides: Partial<MarketBreadthRunResult> = {},
  ): MarketBreadthRunResult {
    return {
      scanDate: '2026-10-23',
      universeSize: 1500,
      sessionsRecomputed: ['2026-10-23'],
      aggregates: [aggregateOn('2026-10-23')],
      ...overrides,
    };
  }

  beforeEach(() => {
    analysisService = {
      runDaily: jest.fn().mockResolvedValue(runResult()),
      runBackfill: jest.fn(),
    };
    notifyJobStart = jest.fn().mockResolvedValue(undefined);
    notifyJobSuccess = jest.fn().mockResolvedValue(undefined);
    notifyJobError = jest
      .fn<Promise<void>, [unknown, Error]>()
      .mockResolvedValue(undefined);
    service = new MarketBreadthCronService(analysisService, {
      notifyJobStart,
      notifyJobSuccess,
      notifyJobError,
    } as unknown as CronJobNotificationService);
  });

  it('notifies the job start once', async () => {
    await service.runDailyBreadth();

    expect(notifyJobStart).toHaveBeenCalledTimes(1);
    expect(notifyJobStart).toHaveBeenCalledWith(
      expect.objectContaining({ jobType: 'market-breadth' }),
    );
  });

  it('reports the latest saved session date and counts on success', async () => {
    await service.runDailyBreadth();

    expect(notifyJobSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalData: 'latest=2026-10-23 NH=42 NL=7 universe=1500',
      }),
    );
    expect(notifyJobError).not.toHaveBeenCalled();
  });

  it('shows a stale newest session in the success push', async () => {
    analysisService.runDaily.mockResolvedValue(
      runResult({
        sessionsRecomputed: ['2026-10-22'],
        aggregates: [aggregateOn('2026-10-22')],
      }),
    );

    await service.runDailyBreadth();

    expect(notifyJobSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalData: 'latest=2026-10-22 NH=42 NL=7 universe=1500',
      }),
    );
  });

  it('alerts instead of reporting success when no session was saved', async () => {
    analysisService.runDaily.mockResolvedValue(
      runResult({ sessionsRecomputed: [], aggregates: [] }),
    );

    await service.runDailyBreadth();

    expect(notifyJobSuccess).not.toHaveBeenCalled();
    expect(notifyJobError).toHaveBeenCalledTimes(1);
    const reported = notifyJobError.mock.calls[0][1];
    expect(reported.message).toContain('saved no session');
  });

  it('alerts and swallows a failed run', async () => {
    const error = new Error('python crashed');
    analysisService.runDaily.mockRejectedValue(error);

    await expect(service.runDailyBreadth()).resolves.toBeUndefined();

    expect(notifyJobSuccess).not.toHaveBeenCalled();
    expect(notifyJobError).toHaveBeenCalledWith(
      expect.objectContaining({ jobType: 'market-breadth' }),
      error,
    );
  });
});
