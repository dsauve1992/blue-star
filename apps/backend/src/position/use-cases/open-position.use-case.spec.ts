import { Test, TestingModule } from '@nestjs/testing';
import {
  OpenPositionRequestDto,
  OpenPositionUseCase,
} from './open-position.use-case';
import { PositionWriteRepository } from '../domain/repositories/position-write.repository.interface';
import { POSITION_WRITE_REPOSITORY } from '../position.module';
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
    it('should successfully open a position and return the created position details', async () => {
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

      expect(mockPositionWriteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          positionId: PositionId.of(expectedUuid),
          portfolioId: request.portfolioId,
          instrument: request.instrument,
        }),
      );

      expect(result).toEqual({
        positionId: PositionId.of(expectedUuid),
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
