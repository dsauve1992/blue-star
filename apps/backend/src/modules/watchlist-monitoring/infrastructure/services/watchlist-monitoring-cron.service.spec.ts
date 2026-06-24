import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WatchlistMonitoringCronService } from './watchlist-monitoring-cron.service';
import { GapDetectedEvent } from '../../domain/events/gap-detected.event';
import { LocalDate } from '../../domain/value-objects/local-date';
import { MonitoringType } from '../../domain/value-objects/monitoring-type';
import { getMarketDateKey } from './market-time.util';
import { Watchlist } from '../../../watchlist/domain/entities/watchlist';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { WatchlistName } from '../../../watchlist/domain/value-objects/watchlist-name';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { UserId } from '../../../position/domain/value-objects/user-id';
import type { WatchlistMonitoringReadRepository } from '../../domain/repositories/watchlist-monitoring-read.repository.interface';
import type { MonitoringAlertLogRepository } from '../../domain/repositories/monitoring-alert-log.repository.interface';
import type { WatchlistReadRepository } from '../../../watchlist/domain/repositories/watchlist-read.repository.interface';
import type { BreakoutDetectionService } from '../../domain/services/breakout-detection.service';
import type { IGapDetectionService } from '../../domain/services/i-gap-detection.service';
import type { NotificationService } from '../../../notification/domain/services/notification.service';
import {
  WATCHLIST_MONITORING_READ_REPOSITORY,
  BREAKOUT_DETECTION_SERVICE,
  GAP_DETECTION_SERVICE,
  MONITORING_ALERT_LOG_REPOSITORY,
} from '../../constants/tokens';
import { WATCHLIST_READ_REPOSITORY } from '../../../watchlist/constants/tokens';
import { NOTIFICATION_SERVICE } from '../../../notification/constants/tokens';

describe('WatchlistMonitoringCronService — gap event emission', () => {
  let service: WatchlistMonitoringCronService;
  let monitoringReadRepository: jest.Mocked<WatchlistMonitoringReadRepository>;
  let alertLogRepository: jest.Mocked<MonitoringAlertLogRepository>;
  let watchlistReadRepository: jest.Mocked<WatchlistReadRepository>;
  let gapDetectionService: jest.Mocked<IGapDetectionService>;
  let notificationService: jest.Mocked<NotificationService>;
  let eventEmitter: EventEmitter2;
  let emitSpy: jest.SpyInstance;

  const watchlistId = WatchlistId.of('wl-123');
  const ticker = WatchlistTicker.of('AAPL');

  function buildWatchlist(): Watchlist {
    const wl = Watchlist.fromData({
      id: watchlistId,
      userId: UserId.of('user-1'),
      name: WatchlistName.of('Momentum'),
      tickers: [ticker],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return wl;
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
    watchlistReadRepository = {
      findById: jest.fn().mockResolvedValue(buildWatchlist()),
    } as unknown as jest.Mocked<WatchlistReadRepository>;
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
          provide: WATCHLIST_READ_REPOSITORY,
          useValue: watchlistReadRepository,
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
});
