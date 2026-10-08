import { Test, TestingModule } from '@nestjs/testing';
import { GetWatchlistByIdUseCase } from '../get-watchlist-by-id.use-case';
import { WatchlistReadRepository } from '../../domain/repositories/watchlist-read.repository.interface';
import { WATCHLIST_READ_REPOSITORY } from '../../constants/tokens';
import { Watchlist } from '../../domain/entities/watchlist';
import { WatchlistId } from '../../domain/value-objects/watchlist-id';
import { WatchlistName } from '../../domain/value-objects/watchlist-name';
import { UserId } from '../../../../shared/value-objects/user-id';
import { AuthorizationError, NotFoundError } from '../../domain/domain-errors';
import type { AuthContext } from '../../../auth/auth-context.interface';

describe('GetWatchlistByIdUseCase', () => {
  let useCase: GetWatchlistByIdUseCase;
  let mockWatchlistReadRepository: jest.Mocked<WatchlistReadRepository>;

  const userId = UserId.of('user-123');
  const watchlistId = WatchlistId.of('11111111-1111-1111-1111-111111111111');
  const authContext: AuthContext = { userId };

  const watchlistOwnedBy = (ownerId: UserId): Watchlist =>
    Watchlist.fromData({
      id: watchlistId,
      userId: ownerId,
      name: WatchlistName.of('My Watchlist'),
      tickers: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  beforeEach(async () => {
    mockWatchlistReadRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetWatchlistByIdUseCase,
        {
          provide: WATCHLIST_READ_REPOSITORY,
          useValue: mockWatchlistReadRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetWatchlistByIdUseCase>(GetWatchlistByIdUseCase);
  });

  describe('execute', () => {
    it('should return the watchlist when it belongs to the user', async () => {
      const watchlist = watchlistOwnedBy(userId);
      mockWatchlistReadRepository.findById.mockResolvedValue(watchlist);

      const result = await useCase.execute({ watchlistId }, authContext);

      expect(mockWatchlistReadRepository.findById).toHaveBeenCalledWith(
        watchlistId,
      );
      expect(result).toEqual({ watchlist });
    });

    it('should throw NotFoundError when the watchlist does not exist', async () => {
      mockWatchlistReadRepository.findById.mockResolvedValue(null);

      const execution = useCase.execute({ watchlistId }, authContext);

      await expect(execution).rejects.toThrow(NotFoundError);
      await expect(execution).rejects.toThrow(
        `Watchlist with ID ${watchlistId.value} not found`,
      );
    });

    it('should throw AuthorizationError when the watchlist belongs to another user', async () => {
      mockWatchlistReadRepository.findById.mockResolvedValue(
        watchlistOwnedBy(UserId.of('other-user')),
      );

      const execution = useCase.execute({ watchlistId }, authContext);

      await expect(execution).rejects.toThrow(AuthorizationError);
      await expect(execution).rejects.toThrow(
        'User does not own this watchlist',
      );
    });
  });
});
