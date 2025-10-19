import { Test, TestingModule } from '@nestjs/testing';
import {
  SellSharesRequestDto,
  SellSharesUseCase,
} from '../sell-shares.use-case';
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

describe('SellSharesUseCase', () => {
  let useCase: SellSharesUseCase;
  let mockPositionWriteRepository: jest.Mocked<PositionWriteRepository>;

  beforeEach(async () => {
    mockPositionWriteRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellSharesUseCase,
        {
          provide: POSITION_WRITE_REPOSITORY,
          useValue: mockPositionWriteRepository,
        },
      ],
    }).compile();

    useCase = module.get<SellSharesUseCase>(SellSharesUseCase);
  });

  describe('Happy Path', () => {
    it('should sell partial shares and return remaining quantity', async () => {
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

      const request: SellSharesRequestDto = {
        positionId,
        quantity: Quantity.of(50),
        price: Price.of(160.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        note: 'Partial sell',
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
        remainingQuantity: 50,
        isClosed: false,
      });
    });

    it('should sell all shares and close position', async () => {
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

      const request: SellSharesRequestDto = {
        positionId,
        quantity: Quantity.of(100),
        price: Price.of(160.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        note: 'Full sell',
      };

      const authContext: AuthContext = { userId };

      const result = await useCase.execute(request, authContext);

      expect(result).toEqual({
        positionId,
        remainingQuantity: 0,
        isClosed: true,
      });
    });
  });

  describe('Authorization', () => {
    it("should throw error when user tries to sell shares from another user's position", async () => {
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

      const request: SellSharesRequestDto = {
        positionId,
        quantity: Quantity.of(50),
        price: Price.of(160.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        note: 'Partial sell',
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
    it('should handle sell without note', async () => {
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

      const request: SellSharesRequestDto = {
        positionId,
        quantity: Quantity.of(50),
        price: Price.of(160.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
      };

      const authContext: AuthContext = { userId };

      const result = await useCase.execute(request, authContext);

      expect(result).toEqual({
        positionId,
        remainingQuantity: 50,
        isClosed: false,
      });
    });
  });

  describe('Error Validation', () => {
    it('should throw error when position is not found', async () => {
      const positionId = PositionId.of('non-existent-position');
      mockPositionWriteRepository.getById.mockRejectedValue(
        new Error('Position not found'),
      );

      const request: SellSharesRequestDto = {
        positionId,
        quantity: Quantity.of(50),
        price: Price.of(160.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        note: 'Partial sell',
      };

      const authContext: AuthContext = { userId: UserId.of('user-123') };

      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        'Position not found',
      );
    });
  });
});
