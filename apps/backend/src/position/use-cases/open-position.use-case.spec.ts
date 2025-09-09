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

      expect(mockPositionWriteRepository.save).toHaveBeenCalledWith(
        expectedPosition,
      );

      expect(result).toEqual({
        positionId: PositionId.of(expectedUuid),
      });
    });

    it('should create and save a position without a note', async () => {
      const expectedUuid = 'test-uuid-456';

      jest
        .spyOn(UuidGeneratorService, 'generate')
        .mockReturnValue(expectedUuid);

      const request: OpenPositionRequestDto = {
        portfolioId: PortfolioId.of('portfolio-456'),
        instrument: Ticker.of('MSFT'),
        quantity: Quantity.of(50),
        price: Price.of(300.0),
        timestamp: IsoTimestamp.of('2024-01-16T14:30:00.000Z'),
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
            note: undefined,
          },
        ],
      );

      expect(mockPositionWriteRepository.save).toHaveBeenCalledWith(
        expectedPosition,
      );

      expect(result).toEqual({
        positionId: PositionId.of(expectedUuid),
      });
    });

    it('should handle repository save failure', async () => {
      const expectedUuid = 'test-uuid-789';
      const saveError = new Error('Database connection failed');

      jest
        .spyOn(UuidGeneratorService, 'generate')
        .mockReturnValue(expectedUuid);

      mockPositionWriteRepository.save.mockRejectedValue(saveError);

      const request: OpenPositionRequestDto = {
        portfolioId: PortfolioId.of('portfolio-789'),
        instrument: Ticker.of('GOOGL'),
        quantity: Quantity.of(25),
        price: Price.of(2500.0),
        timestamp: IsoTimestamp.of('2024-01-17T09:15:00.000Z'),
        note: 'High-value position',
      };

      await expect(useCase.execute(request)).rejects.toThrow(saveError);

      expect(mockPositionWriteRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should generate different UUIDs for different positions', async () => {
      const firstUuid = 'first-uuid-123';
      const secondUuid = 'second-uuid-456';

      jest
        .spyOn(UuidGeneratorService, 'generate')
        .mockReturnValueOnce(firstUuid)
        .mockReturnValueOnce(secondUuid);

      const firstRequest: OpenPositionRequestDto = {
        portfolioId: PortfolioId.of('portfolio-1'),
        instrument: Ticker.of('AAPL'),
        quantity: Quantity.of(100),
        price: Price.of(150.0),
        timestamp: IsoTimestamp.of('2024-01-15T10:00:00.000Z'),
      };

      const secondRequest: OpenPositionRequestDto = {
        portfolioId: PortfolioId.of('portfolio-2'),
        instrument: Ticker.of('TSLA'),
        quantity: Quantity.of(50),
        price: Price.of(200.0),
        timestamp: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
      };

      const firstResult = await useCase.execute(firstRequest);
      const secondResult = await useCase.execute(secondRequest);

      expect(firstResult.positionId.value).toBe(firstUuid);
      expect(secondResult.positionId.value).toBe(secondUuid);
      expect(firstResult.positionId.value).not.toBe(
        secondResult.positionId.value,
      );

      expect(mockPositionWriteRepository.save).toHaveBeenCalledTimes(2);
    });

    describe('input validation', () => {
      it('should throw error for invalid portfolio ID', () => {
        expect(() => {
          PortfolioId.of('');
        }).toThrow('PortfolioId cannot be empty');
      });

      it('should throw error for invalid ticker', () => {
        expect(() => {
          Ticker.of('');
        }).toThrow('Invalid ticker');
      });

      it('should throw error for invalid quantity', () => {
        expect(() => {
          Quantity.of(0);
        }).toThrow('Quantity must be positive integer');
      });

      it('should throw error for invalid price', () => {
        expect(() => {
          Price.of(-50.0);
        }).toThrow('Price must be > 0');
      });

      it('should throw error for invalid timestamp format', () => {
        expect(() => {
          IsoTimestamp.of('invalid-timestamp');
        }).toThrow('Invalid ISO timestamp');
      });
    });
  });
});
