import { Test, TestingModule } from '@nestjs/testing';
import { GetPositionByIdUseCase } from '../get-position-by-id.use-case';
import { PositionReadRepository } from '../../domain/repositories/position-read.repository.interface';
import { POSITION_READ_REPOSITORY } from '../../constants/tokens';
import { PositionId } from '../../domain/value-objects/position-id';
import { Position } from '../../domain/entities/position';
import { UserId } from '../../domain/value-objects/user-id';
import { Ticker } from '../../domain/value-objects/ticker';
import { Quantity } from '../../domain/value-objects/quantity';
import { Price } from '../../domain/value-objects/price';
import { StopPrice } from '../../domain/value-objects/stop-price';
import { IsoTimestamp } from '../../domain/value-objects/iso-timestamp';
import { Action } from '../../domain/entities/position';

describe('GetPositionByIdUseCase', () => {
  let useCase: GetPositionByIdUseCase;
  let mockPositionReadRepository: jest.Mocked<PositionReadRepository>;

  beforeEach(async () => {
    mockPositionReadRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPositionByIdUseCase,
        {
          provide: POSITION_READ_REPOSITORY,
          useValue: mockPositionReadRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetPositionByIdUseCase>(GetPositionByIdUseCase);
  });

  describe('execute', () => {
    it('should return position when user owns it', async () => {
      // Arrange
      const positionId = PositionId.of('test-position-id');
      const userId = UserId.of('test-user-id');
      const position = Position.fromEvents(positionId, userId, [
        {
          action: Action.BUY,
          ts: IsoTimestamp.of('2024-01-15T10:30:00.000Z'),
          instrument: Ticker.of('AAPL'),
          qty: Quantity.of(100),
          price: Price.of(150.5),
          note: 'Test position',
        },
        {
          action: Action.STOP_LOSS,
          ts: IsoTimestamp.of('2024-01-15T10:30:00.000Z'),
          instrument: Ticker.of('AAPL'),
          stop: StopPrice.of(140.0),
          note: 'Test position',
        },
      ]);

      mockPositionReadRepository.findById.mockResolvedValue(position);

      const request = { positionId };
      const authContext = { userId };

      // Act
      const result = await useCase.execute(request, authContext);

      // Assert
      expect(result.position).toEqual(position);
      expect(mockPositionReadRepository.findById).toHaveBeenCalledWith(
        positionId,
      );
    });

    it('should throw error when position is not found', async () => {
      // Arrange
      const positionId = PositionId.of('non-existent-position-id');
      const userId = UserId.of('test-user-id');

      mockPositionReadRepository.findById.mockResolvedValue(null);

      const request = { positionId };
      const authContext = { userId };

      // Act & Assert
      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        'Position with ID non-existent-position-id not found',
      );
    });

    it('should throw error when user does not own position', async () => {
      // Arrange
      const positionId = PositionId.of('test-position-id');
      const userId = UserId.of('test-user-id');
      const otherUserId = UserId.of('other-user-id');
      const position = Position.fromEvents(positionId, otherUserId, [
        {
          action: Action.BUY,
          ts: IsoTimestamp.of('2024-01-15T10:30:00.000Z'),
          instrument: Ticker.of('AAPL'),
          qty: Quantity.of(100),
          price: Price.of(150.5),
          note: 'Test position',
        },
        {
          action: Action.STOP_LOSS,
          ts: IsoTimestamp.of('2024-01-15T10:30:00.000Z'),
          instrument: Ticker.of('AAPL'),
          stop: StopPrice.of(140.0),
          note: 'Test position',
        },
      ]);

      mockPositionReadRepository.findById.mockResolvedValue(position);

      const request = { positionId };
      const authContext = { userId };

      // Act & Assert
      await expect(useCase.execute(request, authContext)).rejects.toThrow(
        'User does not own this position',
      );
    });
  });
});
