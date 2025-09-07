import { Test, TestingModule } from '@nestjs/testing';
import {
  OpenPositionRequestDto,
  OpenPositionUseCase,
} from './open-position.use-case';
import { PositionWriteRepository } from '../domain/repositories/position-write.repository.interface';
import { POSITION_WRITE_REPOSITORY } from '../position.module';
import { Position } from '../domain/entities/position';
import { PositionId } from '../domain/value-objects/position-id';
import { PortfolioId } from '../domain/value-objects/portfolio-id';
import { Ticker } from '../domain/value-objects/ticker';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';

describe('OpenPositionUseCase', () => {
  let useCase: OpenPositionUseCase;
  let mockPositionWriteRepository: jest.Mocked<PositionWriteRepository>;

  beforeEach(async () => {
    // Create mock repository
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
    it('should successfully open a position and return the created position details', async () => {
      // Arrange
      const request: OpenPositionRequestDto = {
        portfolioId: PortfolioId.of('portfolio-123'),
        instrument: Ticker.of('AAPL'),
        quantity: Quantity.of(100),
        price: Price.of(150.5),
        timestamp: IsoTimestamp.of('2024-01-15T10:30:00Z'),
        note: 'Initial position',
      };

      // Mock the save method to return void
      mockPositionWriteRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(mockPositionWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(mockPositionWriteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          portfolioId: request.portfolioId,
          instrument: request.instrument,
        }),
      );

      expect(result).toEqual({
        positionId: expect.any(PositionId),
        portfolioId: request.portfolioId,
        instrument: request.instrument,
        quantity: request.quantity.value,
        price: request.price.value,
        timestamp: request.timestamp,
        note: request.note,
      });
    });
  });
});
