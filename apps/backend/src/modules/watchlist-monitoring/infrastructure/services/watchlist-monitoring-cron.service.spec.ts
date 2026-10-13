import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WatchlistMonitoringCronService } from './watchlist-monitoring-cron.service';
import { GapDetectedEvent } from '../../domain/events/gap-detected.event';
import { LocalDate } from '../../domain/value-objects/local-date';
import { MonitoringType } from '../../domain/value-objects/monitoring-type';
import * as marketTime from './market-time.util';
import { getMarketDateKey } from './market-time.util';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { FindWatchlistTickersUseCase } from '../../../watchlist/use-cases/find-watchlist-tickers.use-case';
import type { WatchlistMonitoringReadRepository } from '../../domain/repositories/watchlist-monitoring-read.repository.interface';
import type { MonitoringAlertLogRepository } from '../../domain/repositories/monitoring-alert-log.repository.interface';
import type { BreakoutDetectionService } from '../../domain/services/breakout-detection.service';
import type { IGapDetectionService } from '../../domain/services/i-gap-detection.service';
import type { NotificationService } from '../../../notification/domain/services/notification.service';
import {
  WATCHLIST_MONITORING_READ_REPOSITORY,
  BREAKOUT_DETECTION_SERVICE,
  GAP_DETECTION_SERVICE,
  MONITORING_ALERT_LOG_REPOSITORY,
} from '../../constants/tokens';
import { NOTIFICATION_SERVICE } from '../../../notification/constants/tokens';

describe('WatchlistMonitoringCronService — gap event emission', () => {
  let service: WatchlistMonitoringCronService;
  let monitoringReadRepository: jest.Mocked<WatchlistMonitoringReadRepository>;
  let alertLogRepository: jest.Mocked<MonitoringAlertLogRepository>;
  let findWatchlistTickers: jest.Mocked<FindWatchlistTickersUseCase>;
  let gapDetectionService: jest.Mocked<IGapDetectionService>;
  let notificationService: jest.Mocked<NotificationService>;
  let eventEmitter: EventEmitter2;
  let emitSpy: jest.SpyInstance;

  const watchlistId = WatchlistId.of('wl-123');
  const ticker = WatchlistTicker.of('AAPL');

  function buildWatchlist() {
    return { id: watchlistId, name: 'Momentum', tickers: [ticker] };
  }

  beforeEach(async () => {
    monitoringReadRepository = {
      findByWatchlistId: jest.fn(),
      findByWatchlistIdAndType: jest.fn(),
      findAllActive: jest.fn(),
      findAllActiveByType: jest
        .fn()
        .mockResolvedValue([{ watchlistId } as never]),
    };
    alertLogRepository = {
      hasAlerted: jest.fn().mockResolvedValue(false),
      recordAlert: jest.fn().mockResolvedValue(undefined),
    };
    findWatchlistTickers = {
      execute: jest.fn().mockResolvedValue(buildWatchlist()),
    } as unknown as jest.Mocked<FindWatchlistTickersUseCase>;
    gapDetectionService = {
      detect: jest.fn().mockResolvedValue({
        ticker,
        detected: true,
        entryPrice: 108,
        stopPrice: 100,
      }),
    };
    notificationService = { send: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistMonitoringCronService,
        EventEmitter2,
        {
          provide: WATCHLIST_MONITORING_READ_REPOSITORY,
          useValue: monitoringReadRepository,
        },
        {
          provide: MONITORING_ALERT_LOG_REPOSITORY,
          useValue: alertLogRepository,
        },
        {
          provide: FindWatchlistTickersUseCase,
          useValue: findWatchlistTickers,
        },
        {
          provide: BREAKOUT_DETECTION_SERVICE,
          useValue: { detect: jest.fn() } as Partial<BreakoutDetectionService>,
        },
        { provide: GAP_DETECTION_SERVICE, useValue: gapDetectionService },
        { provide: NOTIFICATION_SERVICE, useValue: notificationService },
      ],
    }).compile();

    service = module.get(WatchlistMonitoringCronService);
    eventEmitter = module.get(EventEmitter2);
    emitSpy = jest.spyOn(eventEmitter, 'emit');
  });

  it('emits a GapDetectedEvent on first detection, with the full payload', async () => {
    let emittedName: string | undefined;
    let emittedEvent: GapDetectedEvent | undefined;
    emitSpy.mockImplementation((name: string, payload: GapDetectedEvent) => {
      emittedName = name;
      emittedEvent = payload;
      return true;
    });

    await service.monitorGaps();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emittedName).toBe(GapDetectedEvent.NAME);
    expect(emittedEvent).toBeInstanceOf(GapDetectedEvent);
    const gapEvent = emittedEvent as GapDetectedEvent;
    expect(gapEvent.ticker.value).toBe('AAPL');
    expect(gapEvent.watchlistId.value).toBe('wl-123');
    expect(gapEvent.watchlistName).toBe('Momentum');
    expect(gapEvent.marketDate).toBeInstanceOf(LocalDate);
    expect(gapEvent.marketDate.key).toBe(getMarketDateKey());
    expect(gapEvent.detectedAt).toBeInstanceOf(Date);
    expect(gapEvent.entryPrice).toBe(108);
    expect(gapEvent.stopPrice).toBe(100);
  });

  it('does not emit when no gap is detected', async () => {
    gapDetectionService.detect.mockResolvedValue({ ticker, detected: false });

    await service.monitorGaps();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it('does not emit when already alerted today (de-dup gate)', async () => {
    alertLogRepository.hasAlerted.mockResolvedValue(true);

    await service.monitorGaps();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(alertLogRepository.recordAlert).not.toHaveBeenCalled();
  });

  it('records the GAP alert when it emits', async () => {
    await service.monitorGaps();

    expect(alertLogRepository.recordAlert).toHaveBeenCalledWith(
      'AAPL',
      getMarketDateKey(),
      MonitoringType.GAP,
    );
  });

  it('does not record or emit when sending fails, and continues with the next ticker', async () => {
    const ticker2 = WatchlistTicker.of('MSFT');
    findWatchlistTickers.execute.mockResolvedValue({
      id: watchlistId,
      name: 'Momentum',
      tickers: [ticker, ticker2],
    } as never);
    notificationService.send
      .mockRejectedValueOnce(new Error('ntfy down'))
      .mockResolvedValue(undefined);

    await service.monitorGaps();

    expect(notificationService.send).toHaveBeenCalledTimes(2);
    expect(alertLogRepository.recordAlert).toHaveBeenCalledTimes(1);
    expect(alertLogRepository.recordAlert).toHaveBeenCalledWith(
      'MSFT',
      getMarketDateKey(),
      MonitoringType.GAP,
    );
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(
      GapDetectedEvent.NAME,
      expect.objectContaining({ ticker: ticker2 }),
    );
  });
});

describe('WatchlistMonitoringCronService — breakout alerting', () => {
  let service: WatchlistMonitoringCronService;
  let alertLogRepository: jest.Mocked<MonitoringAlertLogRepository>;
  let breakoutDetectionService: jest.Mocked<BreakoutDetectionService>;
  let notificationService: jest.Mocked<NotificationService>;

  const watchlistId = WatchlistId.of('wl-123');
  const aapl = WatchlistTicker.of('AAPL');
  const msft = WatchlistTicker.of('MSFT');

  beforeEach(async () => {
    jest.spyOn(marketTime, 'isWithinMarketHours').mockReturnValue(true);
    alertLogRepository = {
      hasAlerted: jest.fn().mockResolvedValue(false),
      recordAlert: jest.fn().mockResolvedValue(undefined),
    };
    breakoutDetectionService = {
      detect: jest
        .fn()
        .mockImplementation((ticker: WatchlistTicker) =>
          Promise.resolve({ ticker, detected: true }),
        ),
    } as unknown as jest.Mocked<BreakoutDetectionService>;
    notificationService = { send: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistMonitoringCronService,
        EventEmitter2,
        {
          provide: WATCHLIST_MONITORING_READ_REPOSITORY,
          useValue: {
            findAllActiveByType: jest
              .fn()
              .mockResolvedValue([{ watchlistId } as never]),
          } as Partial<WatchlistMonitoringReadRepository>,
        },
        {
          provide: MONITORING_ALERT_LOG_REPOSITORY,
          useValue: alertLogRepository,
        },
        {
          provide: FindWatchlistTickersUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({
              id: watchlistId,
              name: 'Momentum',
              tickers: [aapl, msft],
            }),
          },
        },
        {
          provide: BREAKOUT_DETECTION_SERVICE,
          useValue: breakoutDetectionService,
        },
        { provide: GAP_DETECTION_SERVICE, useValue: { detect: jest.fn() } },
        { provide: NOTIFICATION_SERVICE, useValue: notificationService },
      ],
    }).compile();

    service = module.get(WatchlistMonitoringCronService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records the BREAKOUT alert after the notification is sent', async () => {
    await service.monitorBreakouts();

    expect(alertLogRepository.recordAlert).toHaveBeenCalledWith(
      'AAPL',
      getMarketDateKey(),
      MonitoringType.BREAKOUT,
    );
  });

  it('does not record the alert when sending fails, and continues with the next ticker', async () => {
    notificationService.send
      .mockRejectedValueOnce(new Error('ntfy down'))
      .mockResolvedValue(undefined);

    await service.monitorBreakouts();

    expect(notificationService.send).toHaveBeenCalledTimes(2);
    expect(alertLogRepository.recordAlert).toHaveBeenCalledTimes(1);
    expect(alertLogRepository.recordAlert).toHaveBeenCalledWith(
      'MSFT',
      getMarketDateKey(),
      MonitoringType.BREAKOUT,
    );
  });
});
