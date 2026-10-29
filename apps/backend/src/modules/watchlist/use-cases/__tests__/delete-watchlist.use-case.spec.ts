import { Test, TestingModule } from '@nestjs/testing';
import {
  DeleteWatchlistRequestDto,
  DeleteWatchlistUseCase,
} from '../delete-watchlist.use-case';
import { WatchlistWriteRepository } from '../../domain/repositories/watchlist-write.repository.interface';
import { WATCHLIST_WRITE_REPOSITORY } from '../../constants/tokens';
import { Watchlist } from '../../domain/entities/watchlist';
import { WatchlistId } from '../../domain/value-objects/watchlist-id';
import { WatchlistName } from '../../domain/value-objects/watchlist-name';
import { AuthorizationError } from '../../domain/domain-errors';
import { UserId } from '../../../../shared/value-objects/user-id';
import type { AuthContext } from '../../../auth/auth.module';

describe('DeleteWatchlistUseCase', () => {
  let useCase: DeleteWatchlistUseCase;
  let mockWatchlistWriteRepository: jest.Mocked<WatchlistWriteRepository>;

  const userId = UserId.of('user-123');
  const watchlistId = WatchlistId.of('11111111-1111-1111-1111-111111111111');
  const authContext: AuthContext = { userId };
  const request: DeleteWatchlistRequestDto = { watchlistId };

  const buildWatchlist = (ownerId: UserId): Watchlist =>
    Watchlist.fromData({
      id: watchlistId,
      userId: ownerId,
      name: WatchlistName.of('Growth'),
      tickers: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  beforeEach(async () => {
    mockWatchlistWriteRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteWatchlistUseCase,
        {
          provide: WATCHLIST_WRITE_REPOSITORY,
          useValue: mockWatchlistWriteRepository,
        },
      ],
    }).compile();

    useCase = module.get<DeleteWatchlistUseCase>(DeleteWatchlistUseCase);
  });

  describe('execute', () => {
    it('should delete the watchlist and report success', async () => {
      mockWatchlistWriteRepository.getById.mockResolvedValue(
        buildWatchlist(userId),
      );

      const result = await useCase.execute(request, authContext);

      expect(mockWatchlistWriteRepository.delete).toHaveBeenCalledWith(
        watchlistId,
      );
      expect(result).toEqual({ success: true });
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
      expect(mockWatchlistWriteRepository.delete).not.toHaveBeenCalled();
    });
  });
});
