import { Test, TestingModule } from '@nestjs/testing';
import {
  ActivateMonitoringRequestDto,
  ActivateMonitoringUseCase,
} from './activate-monitoring.use-case';
import { WatchlistMonitoringWriteRepository } from '../domain/repositories/watchlist-monitoring-write.repository.interface';
import { GetWatchlistByIdUseCase } from '../../watchlist/use-cases/get-watchlist-by-id.use-case';
import { WATCHLIST_MONITORING_WRITE_REPOSITORY } from '../constants/tokens';
import { WatchlistMonitoring } from '../domain/entities/watchlist-monitoring.entity';
import { WatchlistMonitoringId } from '../domain/value-objects/watchlist-monitoring-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import { Watchlist } from '../../watchlist/domain/entities/watchlist';
import { WatchlistName } from '../../watchlist/domain/value-objects/watchlist-name';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { UserId } from '../../../shared/value-objects/user-id';
import { AuthorizationError, NotFoundError } from '../domain/domain-errors';
import type { AuthContext } from '../../auth/auth-context.interface';

describe('ActivateMonitoringUseCase', () => {
  let useCase: ActivateMonitoringUseCase;
  let mockMonitoringWriteRepository: jest.Mocked<WatchlistMonitoringWriteRepository>;
  let mockGetWatchlistById: jest.Mocked<GetWatchlistByIdUseCase>;

  const userId = UserId.of('user-123');
  const watchlistId = WatchlistId.of('11111111-1111-1111-1111-111111111111');
  const authContext: AuthContext = { userId };

  const request: ActivateMonitoringRequestDto = {
    watchlistId,
    type: MonitoringType.BREAKOUT,
  };

  const ownedWatchlist = (): Watchlist =>
    Watchlist.fromData({
      id: watchlistId,
      userId,
      name: WatchlistName.of('My Watchlist'),
      tickers: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  beforeEach(async () => {
    mockMonitoringWriteRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByWatchlistIdAndType: jest.fn(),
    };

    mockGetWatchlistById = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetWatchlistByIdUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivateMonitoringUseCase,
        {
          provide: WATCHLIST_MONITORING_WRITE_REPOSITORY,
          useValue: mockMonitoringWriteRepository,
        },
        {
          provide: GetWatchlistByIdUseCase,
          useValue: mockGetWatchlistById,
        },
      ],
    }).compile();

    useCase = module.get<ActivateMonitoringUseCase>(ActivateMonitoringUseCase);
  });

  describe('execute', () => {
    it('should reactivate and save the existing monitoring when one is found', async () => {
      mockGetWatchlistById.execute.mockResolvedValue({
        watchlist: ownedWatchlist(),
      });
      const existing = WatchlistMonitoring.fromData({
        id: WatchlistMonitoringId.of('22222222-2222-2222-2222-222222222222'),
        watchlistId,
        type: MonitoringType.BREAKOUT,
        active: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      mockMonitoringWriteRepository.findByWatchlistIdAndType.mockResolvedValue(
        existing,
      );

      const result = await useCase.execute(request, authContext);

      expect(mockGetWatchlistById.execute).toHaveBeenCalledWith(
        { watchlistId },
        authContext,
      );

      expect(
        mockMonitoringWriteRepository.findByWatchlistIdAndType,
      ).toHaveBeenCalledWith(watchlistId, MonitoringType.BREAKOUT);
      expect(mockMonitoringWriteRepository.save).toHaveBeenCalledWith(existing);
      expect(existing.active).toBe(true);
      expect(result).toEqual({
        monitorings: [
          {
            monitoringId: existing.id,
            type: MonitoringType.BREAKOUT,
            active: true,
          },
        ],
      });
    });

    it('should create and save a new monitoring when none exists', async () => {
      mockGetWatchlistById.execute.mockResolvedValue({
        watchlist: ownedWatchlist(),
      });
      mockMonitoringWriteRepository.findByWatchlistIdAndType.mockResolvedValue(
        null,
      );

      const result = await useCase.execute(request, authContext);

      expect(mockMonitoringWriteRepository.save).toHaveBeenCalledTimes(1);
      const saved = mockMonitoringWriteRepository.save.mock.calls[0][0];
      expect(saved.watchlistId).toEqual(watchlistId);
      expect(saved.type).toBe(MonitoringType.BREAKOUT);
      expect(saved.active).toBe(true);
      expect(result).toEqual({
        monitorings: [
          {
            monitoringId: saved.id,
            type: MonitoringType.BREAKOUT,
            active: true,
          },
        ],
      });
    });

    it('should activate every monitoring type when no type is given', async () => {
      mockGetWatchlistById.execute.mockResolvedValue({
        watchlist: ownedWatchlist(),
      });
      mockMonitoringWriteRepository.findByWatchlistIdAndType.mockResolvedValue(
        null,
      );

      const result = await useCase.execute({ watchlistId }, authContext);

      const allTypes = Object.values(MonitoringType);
      expect(mockMonitoringWriteRepository.save).toHaveBeenCalledTimes(
        allTypes.length,
      );
      const savedTypes = mockMonitoringWriteRepository.save.mock.calls.map(
        (call) => call[0].type,
      );
      expect(savedTypes).toEqual(allTypes);
      expect(result.monitorings.map((m) => m.type)).toEqual(allTypes);
      expect(result.monitorings.every((m) => m.active)).toBe(true);
    });

    it('should throw NotFoundError when the watchlist does not exist', async () => {
      mockGetWatchlistById.execute.mockRejectedValue(
        new NotFoundError(`Watchlist with ID ${watchlistId.value} not found`),
      );

      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        NotFoundError,
      );
      expect(
        mockMonitoringWriteRepository.findByWatchlistIdAndType,
      ).not.toHaveBeenCalled();
      expect(mockMonitoringWriteRepository.save).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError when the watchlist belongs to another user', async () => {
      mockGetWatchlistById.execute.mockRejectedValue(
        new AuthorizationError('User does not own this watchlist'),
      );

      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        AuthorizationError,
      );
      expect(
        mockMonitoringWriteRepository.findByWatchlistIdAndType,
      ).not.toHaveBeenCalled();
      expect(mockMonitoringWriteRepository.save).not.toHaveBeenCalled();
    });
  });
});
