import { Test, TestingModule } from '@nestjs/testing';
import {
  OpenPositionRequestDto,
  OpenPositionUseCase,
} from './open-position.use-case';
import { PositionWriteRepository } from '../domain/repositories/position-write.repository.interface';
import { POSITION_WRITE_REPOSITORY } from '../position.module';
import { Action, Position } from '../domain/entities/position';
import { PositionId } from '../domain/value-objects/position-id';
import { PortfolioId } from '../domain/value-objects/portfolio-id';
import { Ticker } from '../domain/value-objects/ticker';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';
import { UuidGeneratorService } from '../domain/services/uuid-generator.service';

describe('OpenPositionUseCase', () => {
  let useCase: OpenPositionUseCase;
  let mockPositionWriteRepository: jest.Mocked<PositionWriteRepository>;

  beforeEach(async () => {
    mockPositionWriteRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenPositionUseCase,
        {
          provide: POSITION_WRITE_REPOSITORY,
          useValue: mockPositionWriteRepository,
        },
      ],
    }).compile();

    useCase = module.get<OpenPositionUseCase>(OpenPositionUseCase);
  });

  describe('execute', () => {
    it('should create and save a position with the correct data and return the position ID', async () => {
      const expectedUuid = 'test-uuid-123';

      jest
        .spyOn(UuidGeneratorService, 'generate')
        .mockReturnValue(expectedUuid);

      const request: OpenPositionRequestDto = {
        portfolioId: PortfolioId.of('portfolio-123'),
        instrument: Ticker.of('AAPL'),
        quantity: Quantity.of(100),
        price: Price.of(150.5),
        timestamp: IsoTimestamp.of('2024-01-15T10:30:00.000Z'),
        note: 'Initial position',
      };

      const result = await useCase.execute(request);

      const expectedPosition = Position.fromEvents(
        PositionId.of(expectedUuid),
        [
          {
            action: Action.BUY,
            ts: request.timestamp,
            portfolioId: request.portfolioId,
            instrument: request.instrument,
            qty: request.quantity,
            price: request.price,
            note: request.note,
          },
        ],
      );

      // Assert - Verify the mutation was called with exact data
      expect(mockPositionWriteRepository.save).toHaveBeenCalledWith(
        expectedPosition,
      );

      // Assert - Verify the return value
      expect(result).toEqual({
        positionId: PositionId.of(expectedUuid),
      });
    });
  });
});
