import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { DatabaseModule } from '../../../../../config/database.module';
import { PositionWriteRepository } from '../../../domain/repositories/position-write.repository.interface';
import { PositionWriteRepository as PostgresPositionWriteRepository } from '../position-write.repository';
import { Position } from '../../../domain/entities/position';
import { PositionId } from '../../../domain/value-objects/position-id';
import { UserId } from '../../../domain/value-objects/user-id';
import { Ticker } from '../../../domain/value-objects/ticker';
import { Quantity } from '../../../domain/value-objects/quantity';
import { Price } from '../../../domain/value-objects/price';
import { IsoTimestamp } from '../../../domain/value-objects/iso-timestamp';
import { UuidGeneratorService } from '../../../../../shared/services/uuid-generator.service';
import { InvariantError } from '../../../domain/domain-errors';

describe('PositionWriteRepository Integration', () => {
  let module: TestingModule;
  let repository: PositionWriteRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    jest
      .spyOn(UuidGeneratorService, 'generate')
      .mockReturnValue('550e8400-e29b-41d4-a716-446655440000');

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        DatabaseModule,
      ],
      providers: [
        {
          provide: 'POSITION_WRITE_REPOSITORY',
          useClass: PostgresPositionWriteRepository,
        },
      ],
    }).compile();

    repository = module.get<PositionWriteRepository>(
      'POSITION_WRITE_REPOSITORY',
    );
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM position_events');
    await databaseService.query('DELETE FROM positions');
  });

  describe('save and getById round-trip', () => {
    it('should save a position and retrieve it correctly', async () => {
      const position = Position.open({
        userId: UserId.of('550e8400-e29b-41d4-a716-446655440000'),
        instrument: Ticker.of('AAPL'),
        ts: IsoTimestamp.of('2024-01-15T10:30:00.000Z'),
        qty: Quantity.of(100),
        price: Price.of(150.5),
        note: 'Test position',
      });

      await repository.save(position);
      const retrievedPosition = await repository.getById(position.id);

      expect(retrievedPosition).toBeDefined();
      expect(retrievedPosition).not.toBeNull();
      expect(retrievedPosition.id).toEqual(position.id);
      expect(retrievedPosition.userId).toEqual(position.userId);
      expect(retrievedPosition.instrument).toEqual(position.instrument);
      expect(retrievedPosition.currentQty).toBe(position.currentQty);
      expect(retrievedPosition.isClosed).toBe(position.isClosed);
    });
  });

  describe('getById error handling', () => {
    it('should throw InvariantError when position not found', async () => {
      const nonExistentId = PositionId.of(
        '550e8400-e29b-41d4-a716-446655449999',
      );

      await expect(repository.getById(nonExistentId)).rejects.toThrow(
        InvariantError,
      );
      await expect(repository.getById(nonExistentId)).rejects.toThrow(
        'Position with ID 550e8400-e29b-41d4-a716-446655449999 not found',
      );
    });
  });
});
