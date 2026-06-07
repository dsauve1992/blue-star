import { Test, TestingModule } from '@nestjs/testing';
import {
  GetMonitoringStatusRequestDto,
  GetMonitoringStatusUseCase,
} from './get-monitoring-status.use-case';
import { WatchlistMonitoringReadRepository } from '../domain/repositories/watchlist-monitoring-read.repository.interface';
import { WatchlistReadRepository } from '../../watchlist/domain/repositories/watchlist-read.repository.interface';
import { WATCHLIST_MONITORING_READ_REPOSITORY } from '../constants/tokens';
import { WATCHLIST_READ_REPOSITORY } from '../../watchlist/constants/tokens';
import { WatchlistMonitoring } from '../domain/entities/watchlist-monitoring.entity';
import { WatchlistMonitoringId } from '../domain/value-objects/watchlist-monitoring-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import { Watchlist } from '../../watchlist/domain/entities/watchlist';
import { WatchlistName } from '../../watchlist/domain/value-objects/watchlist-name';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { UserId } from '../../../modules/position/domain/value-objects/user-id';
import { AuthorizationError, NotFoundError } from '../domain/domain-errors';
import type { AuthContext } from '../../auth/auth-context.interface';

describe('GetMonitoringStatusUseCase', () => {
  let useCase: GetMonitoringStatusUseCase;
  let mockMonitoringReadRepository: jest.Mocked<WatchlistMonitoringReadRepository>;
  let mockWatchlistReadRepository: jest.Mocked<WatchlistReadRepository>;

  const userId = UserId.of('user-123');
  const watchlistId = WatchlistId.of('11111111-1111-1111-1111-111111111111');
  const authContext: AuthContext = { userId };

  const request: GetMonitoringStatusRequestDto = { watchlistId };

  const ownedWatchlist = (ownerId: UserId = userId): Watchlist =>
    Watchlist.fromData({
      id: watchlistId,
      userId: ownerId,
      name: WatchlistName.of('My Watchlist'),
      tickers: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  beforeEach(async () => {
    mockMonitoringReadRepository = {
      findByWatchlistId: jest.fn(),
      findByWatchlistIdAndType: jest.fn(),
      findAllActive: jest.fn(),
      findAllActiveByType: jest.fn(),
    };

    mockWatchlistReadRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMonitoringStatusUseCase,
        {
          provide: WATCHLIST_MONITORING_READ_REPOSITORY,
          useValue: mockMonitoringReadRepository,
        },
        {
          provide: WATCHLIST_READ_REPOSITORY,
          useValue: mockWatchlistReadRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetMonitoringStatusUseCase>(
      GetMonitoringStatusUseCase,
    );
  });

  describe('execute', () => {
    it('should return the mapped monitoring statuses for the watchlist', async () => {
      mockWatchlistReadRepository.findById.mockResolvedValue(ownedWatchlist());
      const monitoring = WatchlistMonitoring.fromData({
        id: WatchlistMonitoringId.of('22222222-2222-2222-2222-222222222222'),
        watchlistId,
        type: MonitoringType.BREAKOUT,
        active: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      mockMonitoringReadRepository.findByWatchlistId.mockResolvedValue([
        monitoring,
      ]);

      const result = await useCase.execute(request, authContext);

      expect(
        mockMonitoringReadRepository.findByWatchlistId,
      ).toHaveBeenCalledWith(watchlistId);
      expect(result).toEqual({
        monitorings: [
          {
            watchlistId: watchlistId.value,
            type: MonitoringType.BREAKOUT,
            active: true,
          },
        ],
      });
    });

    it('should return an empty list when the watchlist has no monitorings', async () => {
      mockWatchlistReadRepository.findById.mockResolvedValue(ownedWatchlist());
      mockMonitoringReadRepository.findByWatchlistId.mockResolvedValue([]);

      const result = await useCase.execute(request, authContext);

      expect(result).toEqual({ monitorings: [] });
    });

    it('should throw NotFoundError when the watchlist does not exist', async () => {
      mockWatchlistReadRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        NotFoundError,
      );
      expect(
        mockMonitoringReadRepository.findByWatchlistId,
      ).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError when the watchlist belongs to another user', async () => {
      mockWatchlistReadRepository.findById.mockResolvedValue(
        ownedWatchlist(UserId.of('other-user')),
      );

      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        AuthorizationError,
      );
      expect(
        mockMonitoringReadRepository.findByWatchlistId,
      ).not.toHaveBeenCalled();
    });
  });
});
