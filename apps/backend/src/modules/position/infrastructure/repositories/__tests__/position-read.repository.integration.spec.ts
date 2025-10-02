import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { PositionReadRepository } from '../../../domain/repositories/position-read.repository.interface';
import { PositionReadRepository as PostgresPositionReadRepository } from '../position-read.repository';
import { PositionId } from '../../../domain/value-objects/position-id';
import { Ticker } from '../../../domain/value-objects/ticker';
import { UuidGeneratorService } from '../../../../../shared/services/uuid-generator.service';

describe('PositionReadRepository Integration', () => {
  let module: TestingModule;
  let repository: PositionReadRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    jest
      .spyOn(UuidGeneratorService, 'generate')
      .mockReturnValue('550e8400-e29b-41d4-a716-446655440100');

    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        {
          provide: 'POSITION_READ_REPOSITORY',
          useClass: PostgresPositionReadRepository,
        },
      ],
    }).compile();

    await module.init();

    repository = module.get<PositionReadRepository>('POSITION_READ_REPOSITORY');
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

  describe('findById', () => {
    it('should find a position by ID', async () => {
      const positionId = '550e8400-e29b-41d4-a716-446655440100';
      const userId = '550e8400-e29b-41d4-a716-446655440101';
      const eventId = '550e8400-e29b-41d4-a716-446655440102';

      await databaseService.query(
        'INSERT INTO positions (id, user_id, instrument, current_qty, closed, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [positionId, userId, 'AAPL', 100, false],
      );

      await databaseService.query(
        'INSERT INTO position_events (id, position_id, action, timestamp, instrument, quantity, price, stop_price, note, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())',
        [
          eventId,
          positionId,
          'BUY',
          '2024-01-15T10:30:00.000Z',
          'AAPL',
          100,
          150.5,
          null,
          'Test position',
        ],
      );

      const foundPosition = await repository.findById(
        PositionId.of(positionId),
      );

      expect(foundPosition).not.toBeNull();
      expect(foundPosition!.instrument).toEqual(Ticker.of('AAPL'));
      expect(foundPosition!.currentQty).toBe(100);
      expect(foundPosition!.isClosed).toBe(false);
    });

    it('should return null when position not found', async () => {
      const nonExistentId = PositionId.of(
        '550e8400-e29b-41d4-a716-446655449999',
      );

      const foundPosition = await repository.findById(nonExistentId);

      expect(foundPosition).toBeNull();
    });
  });
});
