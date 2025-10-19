import { Test, TestingModule } from '@nestjs/testing';
import { BuySharesRequestDto, BuySharesUseCase } from '../buy-shares.use-case';
import { Action, Position } from '../../domain/entities/position';
import { PositionId } from '../../domain/value-objects/position-id';
import { UserId } from '../../domain/value-objects/user-id';
import { Ticker } from '../../domain/value-objects/ticker';
import { Quantity } from '../../domain/value-objects/quantity';
import { Price } from '../../domain/value-objects/price';
import { StopPrice } from '../../domain/value-objects/stop-price';
import { IsoTimestamp } from '../../domain/value-objects/iso-timestamp';
import { PositionWriteRepository } from '../../domain/repositories/position-write.repository.interface';
import type { AuthContext } from '../../../auth/auth-context.interface';
import { POSITION_WRITE_REPOSITORY } from '../../constants/tokens';

describe('BuySharesUseCase', () => {
  let useCase: BuySharesUseCase;
  let mockPositionWriteRepository: jest.Mocked<PositionWriteRepository>;

  beforeEach(async () => {
    mockPositionWriteRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuySharesUseCase,
        {
          provide: POSITION_WRITE_REPOSITORY,
          useValue: mockPositionWriteRepository,
        },
      ],
    }).compile();

    useCase = module.get<BuySharesUseCase>(BuySharesUseCase);
  });

  describe('Happy Path', () => {
    it('should buy additional shares and return total quantity', async () => {
      const userId = UserId.of('user-123');
      const positionId = PositionId.of('position-123');
      const existingPosition = Position.fromEvents(positionId, userId, [
        {
          action: Action.BUY,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          qty: Quantity.of(100),
          price: Price.of(150.0),
          note: 'Initial position',
        },
        {
          action: Action.STOP_LOSS,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          stop: StopPrice.of(140.0),
          note: 'Initial position',
        },
      ]);

      mockPositionWriteRepository.getById.mockResolvedValue(existingPosition);

      const request: BuySharesRequestDto = {
        positionId,
        quantity: Quantity.of(50),
        price: Price.of(155.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        note: 'Additional buy',
      };

      const authContext: AuthContext = { userId };

      const result = await useCase.execute(request, authContext);

      expect(mockPositionWriteRepository.getById).toHaveBeenCalledWith(
        positionId,
      );
      expect(mockPositionWriteRepository.save).toHaveBeenCalledWith(
        existingPosition,
      );
      expect(result).toEqual({
        positionId,
        totalQuantity: 150,
      });
    });

    it('should handle multiple additional buys', async () => {
      const userId = UserId.of('user-123');
      const positionId = PositionId.of('position-123');
      const existingPosition = Position.fromEvents(positionId, userId, [
        {
          action: Action.BUY,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          qty: Quantity.of(100),
          price: Price.of(150.0),
          note: 'Initial position',
        },
        {
          action: Action.STOP_LOSS,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          stop: StopPrice.of(140.0),
          note: 'Initial position',
        },
        {
          action: Action.BUY,
          ts: IsoTimestamp.of('2024-01-15T10:30:00.000Z'),
          instrument: Ticker.of('AAPL'),
          qty: Quantity.of(25),
          price: Price.of(152.0),
          note: 'First additional buy',
        },
      ]);

      mockPositionWriteRepository.getById.mockResolvedValue(existingPosition);

      const request: BuySharesRequestDto = {
        positionId,
        quantity: Quantity.of(75),
        price: Price.of(158.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        note: 'Second additional buy',
      };

      const authContext: AuthContext = { userId };

      const result = await useCase.execute(request, authContext);

      expect(result).toEqual({
        positionId,
        totalQuantity: 200,
      });
    });
  });

  describe('Authorization', () => {
    it("should throw error when user tries to buy shares for another user's position", async () => {
      const ownerUserId = UserId.of('owner-123');
      const requesterUserId = UserId.of('requester-456');
      const positionId = PositionId.of('position-123');

      const existingPosition = Position.fromEvents(positionId, ownerUserId, [
        {
          action: Action.BUY,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          qty: Quantity.of(100),
          price: Price.of(150.0),
          note: 'Initial position',
        },
        {
          action: Action.STOP_LOSS,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          stop: StopPrice.of(140.0),
          note: 'Initial position',
        },
      ]);

      mockPositionWriteRepository.getById.mockResolvedValue(existingPosition);

      const request: BuySharesRequestDto = {
        positionId,
        quantity: Quantity.of(50),
        price: Price.of(155.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        note: 'Additional buy',
      };

      const authContext: AuthContext = { userId: requesterUserId };

      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        'User does not own this position',
      );

      expect(mockPositionWriteRepository.getById).toHaveBeenCalledWith(
        positionId,
      );
      expect(mockPositionWriteRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle buy without note', async () => {
      const userId = UserId.of('user-123');
      const positionId = PositionId.of('position-123');
      const existingPosition = Position.fromEvents(positionId, userId, [
        {
          action: Action.BUY,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          qty: Quantity.of(100),
          price: Price.of(150.0),
          note: 'Initial position',
        },
        {
          action: Action.STOP_LOSS,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          stop: StopPrice.of(140.0),
          note: 'Initial position',
        },
      ]);

      mockPositionWriteRepository.getById.mockResolvedValue(existingPosition);

      const request: BuySharesRequestDto = {
        positionId,
        quantity: Quantity.of(50),
        price: Price.of(155.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
      };

      const authContext: AuthContext = { userId };

      const result = await useCase.execute(request, authContext);

      expect(result).toEqual({
        positionId,
        totalQuantity: 150,
      });
    });

    it('should handle small quantity buys', async () => {
      const userId = UserId.of('user-123');
      const positionId = PositionId.of('position-123');
      const existingPosition = Position.fromEvents(positionId, userId, [
        {
          action: Action.BUY,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          qty: Quantity.of(100),
          price: Price.of(150.0),
          note: 'Initial position',
        },
        {
          action: Action.STOP_LOSS,
          ts: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
          instrument: Ticker.of('AAPL'),
          stop: StopPrice.of(140.0),
          note: 'Initial position',
        },
      ]);

      mockPositionWriteRepository.getById.mockResolvedValue(existingPosition);

      const request: BuySharesRequestDto = {
        positionId,
        quantity: Quantity.of(1),
        price: Price.of(155.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        note: 'Small additional buy',
      };

      const authContext: AuthContext = { userId };

      const result = await useCase.execute(request, authContext);

      expect(result).toEqual({
        positionId,
        totalQuantity: 101,
      });
    });
  });

  describe('Error Validation', () => {
    it('should throw error when position is not found', async () => {
      const positionId = PositionId.of('non-existent-position');
      mockPositionWriteRepository.getById.mockRejectedValue(
        new Error('Position not found'),
      );

      const request: BuySharesRequestDto = {
        positionId,
        quantity: Quantity.of(50),
        price: Price.of(155.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        note: 'Additional buy',
      };

      const authContext: AuthContext = { userId: UserId.of('user-123') };

      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        'Position not found',
      );
    });
  });
});
