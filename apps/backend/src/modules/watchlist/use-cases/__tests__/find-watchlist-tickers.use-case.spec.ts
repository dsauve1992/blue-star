import { Test, TestingModule } from '@nestjs/testing';
import { FindWatchlistTickersUseCase } from '../find-watchlist-tickers.use-case';
import { WatchlistReadRepository } from '../../domain/repositories/watchlist-read.repository.interface';
import { WATCHLIST_READ_REPOSITORY } from '../../constants/tokens';
import { Watchlist } from '../../domain/entities/watchlist';
import { WatchlistId } from '../../domain/value-objects/watchlist-id';
import { WatchlistName } from '../../domain/value-objects/watchlist-name';
import { WatchlistTicker } from '../../domain/value-objects/watchlist-ticker';
import { UserId } from '../../../../shared/value-objects/user-id';

describe('FindWatchlistTickersUseCase', () => {
  let useCase: FindWatchlistTickersUseCase;
  let mockWatchlistReadRepository: jest.Mocked<WatchlistReadRepository>;

  const watchlistId = WatchlistId.of('11111111-1111-1111-1111-111111111111');

  beforeEach(async () => {
    mockWatchlistReadRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindWatchlistTickersUseCase,
        {
          provide: WATCHLIST_READ_REPOSITORY,
          useValue: mockWatchlistReadRepository,
        },
      ],
    }).compile();

    useCase = module.get<FindWatchlistTickersUseCase>(
      FindWatchlistTickersUseCase,
    );
  });

  describe('execute', () => {
    it('should return the id, plain name and ordered tickers of the watchlist', async () => {
      const tickers = [WatchlistTicker.of('MSFT'), WatchlistTicker.of('AAPL')];
      mockWatchlistReadRepository.findById.mockResolvedValue(
        Watchlist.fromData({
          id: watchlistId,
          userId: UserId.of('user-123'),
          name: WatchlistName.of('Momentum'),
          tickers,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      );

      const result = await useCase.execute(watchlistId);

      expect(mockWatchlistReadRepository.findById).toHaveBeenCalledWith(
        watchlistId,
      );
      expect(result).toEqual({ id: watchlistId, name: 'Momentum', tickers });
      expect(result?.name).toBe('Momentum');
    });

    it('should return null when the watchlist does not exist', async () => {
      mockWatchlistReadRepository.findById.mockResolvedValue(null);

      const result = await useCase.execute(watchlistId);

      expect(result).toBeNull();
    });
  });
});
