import { Test, TestingModule } from '@nestjs/testing';
import {
  AddTickerToWatchlistRequestDto,
  AddTickerToWatchlistUseCase,
} from '../add-ticker-to-watchlist.use-case';
import { WatchlistWriteRepository } from '../../domain/repositories/watchlist-write.repository.interface';
import { WATCHLIST_WRITE_REPOSITORY } from '../../constants/tokens';
import { Watchlist } from '../../domain/entities/watchlist';
import { WatchlistId } from '../../domain/value-objects/watchlist-id';
import { WatchlistName } from '../../domain/value-objects/watchlist-name';
import { WatchlistTicker } from '../../domain/value-objects/watchlist-ticker';
import { AuthorizationError, StateError } from '../../domain/domain-errors';
import { UserId } from '../../../../shared/value-objects/user-id';
import type { AuthContext } from '../../../auth/auth.module';

describe('AddTickerToWatchlistUseCase', () => {
  let useCase: AddTickerToWatchlistUseCase;
  let mockWatchlistWriteRepository: jest.Mocked<WatchlistWriteRepository>;

  const userId = UserId.of('user-123');
  const watchlistId = WatchlistId.of('11111111-1111-1111-1111-111111111111');
  const authContext: AuthContext = { userId };
  const ticker = WatchlistTicker.of('NASDAQ:AAPL');

  const buildWatchlist = (
    ownerId: UserId,
    tickers: WatchlistTicker[] = [],
  ): Watchlist =>
    Watchlist.fromData({
      id: watchlistId,
      userId: ownerId,
      name: WatchlistName.of('Growth'),
      tickers,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  const request: AddTickerToWatchlistRequestDto = { watchlistId, ticker };

  beforeEach(async () => {
    mockWatchlistWriteRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddTickerToWatchlistUseCase,
        {
          provide: WATCHLIST_WRITE_REPOSITORY,
          useValue: mockWatchlistWriteRepository,
        },
      ],
    }).compile();

    useCase = module.get<AddTickerToWatchlistUseCase>(
      AddTickerToWatchlistUseCase,
    );
  });

  describe('execute', () => {
    it('should add the ticker and save the watchlist', async () => {
      const existing = buildWatchlist(userId);
      mockWatchlistWriteRepository.getById.mockResolvedValue(existing);

      const result = await useCase.execute(request, authContext);

      expect(mockWatchlistWriteRepository.save).toHaveBeenCalledWith(existing);
      expect(result.watchlist.tickers).toContain(ticker);
    });

    it('should throw when the watchlist belongs to another user', async () => {
      mockWatchlistWriteRepository.getById.mockResolvedValue(
        buildWatchlist(UserId.of('other-user')),
      );

      const execution = useCase.execute(request, authContext);

      await expect(execution).rejects.toBeInstanceOf(AuthorizationError);
      await expect(execution).rejects.toThrow(
        'User does not own this watchlist',
      );
      expect(mockWatchlistWriteRepository.save).not.toHaveBeenCalled();
    });

    it('should throw when the ticker is already in the watchlist', async () => {
      mockWatchlistWriteRepository.getById.mockResolvedValue(
        buildWatchlist(userId, [ticker]),
      );

      await expect(
        useCase.execute(request, authContext),
      ).rejects.toBeInstanceOf(StateError);
      expect(mockWatchlistWriteRepository.save).not.toHaveBeenCalled();
    });
  });
});
