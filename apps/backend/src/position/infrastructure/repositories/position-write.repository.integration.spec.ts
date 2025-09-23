import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../config/database.service';
import { DatabaseModule } from '../../../config/database.module';
import { PositionWriteRepository } from '../../domain/repositories/position-write.repository.interface';
import { PositionWriteRepository as PostgresPositionWriteRepository } from './position-write.repository';
import { Position } from '../../domain/entities/position';
import { PositionId } from '../../domain/value-objects/position-id';
import { UserId } from '../../domain/value-objects/user-id';
import { PortfolioId } from '../../domain/value-objects/portfolio-id';
import { Ticker } from '../../domain/value-objects/ticker';
import { Quantity } from '../../domain/value-objects/quantity';
import { Price } from '../../domain/value-objects/price';
import { IsoTimestamp } from '../../domain/value-objects/iso-timestamp';
import { UuidGeneratorService } from '../../domain/services/uuid-generator.service';
import { InvariantError } from '../../domain/domain-errors';

describe('PositionWriteRepository Integration', () => {
  let module: TestingModule;
  let repository: PositionWriteRepository;
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

    await databaseService.onModuleInit();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM position_events');
    await databaseService.query('DELETE FROM positions');
  });

  describe('save', () => {
    it('should save a position to the database', async () => {
      const position = Position.open({
        userId: UserId.of('test-user-123'),
        portfolioId: PortfolioId.of('550e8400-e29b-41d4-a716-446655440000'),
        instrument: Ticker.of('AAPL'),
        ts: IsoTimestamp.of('2024-01-15T10:30:00.000Z'),
        qty: Quantity.of(100),
        price: Price.of(150.5),
        note: 'Test position',
      });

      await repository.save(position);

      const result = await databaseService.query(
        'SELECT * FROM positions WHERE id = $1',
        ['550e8400-e29b-41d4-a716-446655440000'],
      );

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0] as {
        id: string;
        user_id: string;
        portfolio_id: string;
        instrument: string;
        current_qty: number;
        closed: boolean;
      };
      expect(row.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(row.user_id).toBe('test-user-123');
      expect(row.portfolio_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(row.instrument).toBe('AAPL');
      expect(row.current_qty).toBe(100);
      expect(row.closed).toBe(false);
    });
  });

  describe('getById', () => {
    it('should retrieve a position by ID', async () => {
      const position = Position.open({
        userId: UserId.of('test-user-456'),
        portfolioId: PortfolioId.of('550e8400-e29b-41d4-a716-446655440001'),
        instrument: Ticker.of('GOOGL'),
        ts: IsoTimestamp.of('2024-01-15T11:00:00.000Z'),
        qty: Quantity.of(50),
        price: Price.of(2800.0),
        note: 'Google position',
      });

      await repository.save(position);

      const retrievedPosition = await repository.getById(position.id);

      expect(retrievedPosition).toBeDefined();
      expect(retrievedPosition).not.toBeNull();
      expect(retrievedPosition.portfolioId).toEqual(
        PortfolioId.of('550e8400-e29b-41d4-a716-446655440001'),
      );
      expect(retrievedPosition.instrument).toEqual(Ticker.of('GOOGL'));
      expect(retrievedPosition.currentQty).toBe(50);
      expect(retrievedPosition.isClosed).toBe(false);
    });

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
