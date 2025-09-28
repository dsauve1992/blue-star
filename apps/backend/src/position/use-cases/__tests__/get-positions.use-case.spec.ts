import { Test, TestingModule } from '@nestjs/testing';
import { GetPositionsUseCase } from '../get-positions.use-case';
import { PositionReadRepository } from '../../domain/repositories/position-read.repository.interface';
import { POSITION_READ_REPOSITORY } from '../../constants/tokens';
import { Action, Position } from '../../domain/entities/position';
import { PositionId } from '../../domain/value-objects/position-id';
import { UserId } from '../../domain/value-objects/user-id';
import { PortfolioId } from '../../domain/value-objects/portfolio-id';
import { Ticker } from '../../domain/value-objects/ticker';
import { Quantity } from '../../domain/value-objects/quantity';
import { Price } from '../../domain/value-objects/price';
import { IsoTimestamp } from '../../domain/value-objects/iso-timestamp';
import type { AuthContext } from '../../domain/auth/auth-context.interface';

describe('GetPositionsUseCase', () => {
  let useCase: GetPositionsUseCase;
  let mockPositionReadRepository: jest.Mocked<PositionReadRepository>;

  beforeEach(async () => {
    mockPositionReadRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPositionsUseCase,
        {
          provide: POSITION_READ_REPOSITORY,
          useValue: mockPositionReadRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetPositionsUseCase>(GetPositionsUseCase);
  });

  describe('execute', () => {
    it('should return positions for the authenticated user', async () => {
      const userId = UserId.of('user-123');
      const authContext: AuthContext = { userId };

      const mockPositions = [
        Position.fromEvents(PositionId.of('position-1'), userId, [
          {
            action: Action.BUY,
            ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
            portfolioId: PortfolioId.of('portfolio-123'),
            instrument: Ticker.of('AAPL'),
            qty: Quantity.of(100),
            price: Price.of(150.0),
            note: 'Initial position',
          },
        ]),
        Position.fromEvents(PositionId.of('position-2'), userId, [
          {
            action: Action.BUY,
            ts: IsoTimestamp.of('2024-01-16T14:30:00.000Z'),
            portfolioId: PortfolioId.of('portfolio-123'),
            instrument: Ticker.of('MSFT'),
            qty: Quantity.of(50),
            price: Price.of(300.0),
            note: 'Microsoft position',
          },
        ]),
      ];

      mockPositionReadRepository.findByUserId.mockResolvedValue(mockPositions);

      const result = await useCase.execute(authContext);

      expect(mockPositionReadRepository.findByUserId).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toEqual({
        positions: mockPositions,
      });
    });

    it('should return empty array when user has no positions', async () => {
      const userId = UserId.of('user-456');
      const authContext: AuthContext = { userId };

      mockPositionReadRepository.findByUserId.mockResolvedValue([]);

      const result = await useCase.execute(authContext);

      expect(mockPositionReadRepository.findByUserId).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toEqual({
        positions: [],
      });
    });

    it('should handle repository errors', async () => {
      const userId = UserId.of('user-789');
      const authContext: AuthContext = { userId };
      const repositoryError = new Error('Database connection failed');

      mockPositionReadRepository.findByUserId.mockRejectedValue(
        repositoryError,
      );

      await expect(useCase.execute(authContext)).rejects.toThrow(
        repositoryError,
      );

      expect(mockPositionReadRepository.findByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should return positions with different users separately', async () => {
      const user1Id = UserId.of('user-1');
      const user2Id = UserId.of('user-2');
      const authContext1: AuthContext = { userId: user1Id };
      const authContext2: AuthContext = { userId: user2Id };

      const user1Positions = [
        Position.fromEvents(PositionId.of('position-1'), user1Id, [
          {
            action: Action.BUY,
            ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
            portfolioId: PortfolioId.of('portfolio-1'),
            instrument: Ticker.of('AAPL'),
            qty: Quantity.of(100),
            price: Price.of(150.0),
            note: 'User 1 position',
          },
        ]),
      ];

      const user2Positions = [
        Position.fromEvents(PositionId.of('position-2'), user2Id, [
          {
            action: Action.BUY,
            ts: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
            portfolioId: PortfolioId.of('portfolio-2'),
            instrument: Ticker.of('TSLA'),
            qty: Quantity.of(50),
            price: Price.of(200.0),
            note: 'User 2 position',
          },
        ]),
      ];

      mockPositionReadRepository.findByUserId
        .mockResolvedValueOnce(user1Positions)
        .mockResolvedValueOnce(user2Positions);

      const result1 = await useCase.execute(authContext1);
      const result2 = await useCase.execute(authContext2);

      expect(mockPositionReadRepository.findByUserId).toHaveBeenCalledWith(
        user1Id,
      );
      expect(mockPositionReadRepository.findByUserId).toHaveBeenCalledWith(
        user2Id,
      );
      expect(result1).toEqual({ positions: user1Positions });
      expect(result2).toEqual({ positions: user2Positions });
      expect(result1.positions).not.toEqual(result2.positions);
    });

    it('should handle positions with multiple events', async () => {
      const userId = UserId.of('user-123');
      const authContext: AuthContext = { userId };

      const positionWithMultipleEvents = Position.fromEvents(
        PositionId.of('position-1'),
        userId,
        [
          {
            action: Action.BUY,
            ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
            portfolioId: PortfolioId.of('portfolio-123'),
            instrument: Ticker.of('AAPL'),
            qty: Quantity.of(100),
            price: Price.of(150.0),
            note: 'Initial position',
          },
          {
            action: Action.BUY,
            ts: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
            portfolioId: PortfolioId.of('portfolio-123'),
            instrument: Ticker.of('AAPL'),
            qty: Quantity.of(50),
            price: Price.of(155.0),
            note: 'Additional buy',
          },
        ],
      );

      mockPositionReadRepository.findByUserId.mockResolvedValue([
        positionWithMultipleEvents,
      ]);

      const result = await useCase.execute(authContext);

      expect(result).toEqual({
        positions: [positionWithMultipleEvents],
      });
      expect(result.positions[0].events).toHaveLength(2);
    });
  });
});
