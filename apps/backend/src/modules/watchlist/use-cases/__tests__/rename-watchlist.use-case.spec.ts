import { Test, TestingModule } from '@nestjs/testing';
import {
  RenameWatchlistRequestDto,
  RenameWatchlistUseCase,
} from '../rename-watchlist.use-case';
import { WatchlistWriteRepository } from '../../domain/repositories/watchlist-write.repository.interface';
import { WATCHLIST_WRITE_REPOSITORY } from '../../constants/tokens';
import { Watchlist } from '../../domain/entities/watchlist';
import { WatchlistId } from '../../domain/value-objects/watchlist-id';
import { WatchlistName } from '../../domain/value-objects/watchlist-name';
import { UserId } from '../../../position/domain/value-objects/user-id';
import type { AuthContext } from '../../../auth/auth-context.interface';

describe('RenameWatchlistUseCase', () => {
  let useCase: RenameWatchlistUseCase;
  let mockWatchlistWriteRepository: jest.Mocked<WatchlistWriteRepository>;

  const userId = UserId.of('user-123');
  const watchlistId = WatchlistId.of('11111111-1111-1111-1111-111111111111');
  const authContext: AuthContext = { userId };

  beforeEach(async () => {
    mockWatchlistWriteRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenameWatchlistUseCase,
        {
          provide: WATCHLIST_WRITE_REPOSITORY,
          useValue: mockWatchlistWriteRepository,
        },
      ],
    }).compile();

    useCase = module.get<RenameWatchlistUseCase>(RenameWatchlistUseCase);
  });

  describe('execute', () => {
    it('should rename the watchlist and save it', async () => {
      const existing = Watchlist.fromData({
        id: watchlistId,
        userId,
        name: WatchlistName.of('Old Name'),
        tickers: [],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      mockWatchlistWriteRepository.getById.mockResolvedValue(existing);

      const request: RenameWatchlistRequestDto = {
        watchlistId,
        name: WatchlistName.of('New Name'),
      };

      const result = await useCase.execute(request, authContext);

      expect(mockWatchlistWriteRepository.save).toHaveBeenCalledWith(existing);
      expect(result.watchlist.name.value).toBe('New Name');
    });

    it('should throw when the watchlist belongs to another user', async () => {
      const otherUserId = UserId.of('other-user');
      const existing = Watchlist.fromData({
        id: watchlistId,
        userId: otherUserId,
        name: WatchlistName.of('Old Name'),
        tickers: [],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      mockWatchlistWriteRepository.getById.mockResolvedValue(existing);

      const request: RenameWatchlistRequestDto = {
        watchlistId,
        name: WatchlistName.of('New Name'),
      };

      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        'User does not own this watchlist',
      );
      expect(mockWatchlistWriteRepository.save).not.toHaveBeenCalled();
    });
  });
});
