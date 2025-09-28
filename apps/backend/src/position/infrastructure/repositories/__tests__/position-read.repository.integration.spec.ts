import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../config/database.service';
import { DatabaseModule } from '../../../../config/database.module';
import { PositionReadRepository } from '../../../domain/repositories/position-read.repository.interface';
import { PositionReadRepository as PostgresPositionReadRepository } from '../position-read.repository';
import { PositionId } from '../../../domain/value-objects/position-id';
import { PortfolioId } from '../../../domain/value-objects/portfolio-id';
import { Ticker } from '../../../domain/value-objects/ticker';
import { UuidGeneratorService } from '../../../domain/services/uuid-generator.service';

describe('PositionReadRepository Integration', () => {
  let module: TestingModule;
  let repository: PositionReadRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5433';
    process.env.DB_USERNAME = 'blue_star_user';
    process.env.DB_PASSWORD = 'blue_star_password';
    process.env.DB_DATABASE = 'blue_star_test_db';
    process.env.DB_SSL = 'false';

    jest
      .spyOn(UuidGeneratorService, 'generate')
      .mockReturnValue('550e8400-e29b-41d4-a716-446655440100');

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        DatabaseModule,
      ],
      providers: [
        {
          provide: 'POSITION_READ_REPOSITORY',
          useClass: PostgresPositionReadRepository,
        },
      ],
    }).compile();

    repository = module.get<PositionReadRepository>('POSITION_READ_REPOSITORY');
    databaseService = module.get<DatabaseService>(DatabaseService);

    await databaseService.onModuleInit();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM position_events');
    await databaseService.query('DELETE FROM positions');
  });

  describe('findById', () => {
    it('should find a position by ID', async () => {
      const positionId = '550e8400-e29b-41d4-a716-446655440100';
      const userId = 'test-user-123';
      const portfolioId = '550e8400-e29b-41d4-a716-446655440101';
      const eventId = '550e8400-e29b-41d4-a716-446655440102';

      await databaseService.query(
        'INSERT INTO positions (id, user_id, portfolio_id, instrument, current_qty, closed, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
        [positionId, userId, portfolioId, 'AAPL', 100, false],
      );

      await databaseService.query(
        'INSERT INTO position_events (id, position_id, action, timestamp, portfolio_id, instrument, quantity, price, stop_price, note, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())',
        [
          eventId,
          positionId,
          'BUY',
          '2024-01-15T10:30:00.000Z',
          portfolioId,
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
      expect(foundPosition!.portfolioId).toEqual(
        PortfolioId.of('550e8400-e29b-41d4-a716-446655440101'),
      );
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
