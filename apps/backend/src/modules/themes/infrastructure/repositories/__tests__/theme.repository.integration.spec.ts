import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../../../../config/database.service';
import { ThemeRepository } from '../../../domain/repositories/theme.repository.interface';
import { ThemeRepositoryImpl } from '../theme.repository';
import { ThemeEntity } from '../../../domain/entities/theme.entity';
import { ThemeTickerEntity } from '../../../domain/entities/theme-ticker.entity';
import { THEME_REPOSITORY } from '../../../constants/tokens';

function makeTicker(
  themeId: string,
  ticker: string,
  id = randomUUID(),
): ThemeTickerEntity {
  return ThemeTickerEntity.of({
    id,
    themeId,
    ticker,
    createdAt: new Date(),
  });
}

describe('ThemeRepository Integration', () => {
  let module: TestingModule;
  let repository: ThemeRepository;
  let databaseService: DatabaseService;
  let themeId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        { provide: THEME_REPOSITORY, useClass: ThemeRepositoryImpl },
      ],
    }).compile();

    await module.init();

    repository = module.get<ThemeRepository>(THEME_REPOSITORY);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM theme_tickers');
    await databaseService.query('DELETE FROM themes');
    themeId = randomUUID();
    const now = new Date();
    await repository.saveTheme(
      ThemeEntity.of({
        id: themeId,
        name: 'AI',
        createdAt: now,
        updatedAt: now,
      }),
    );
  });

  it('replaces the existing tickers', async () => {
    await repository.replaceThemeTickers(themeId, [makeTicker(themeId, 'OLD')]);

    await repository.replaceThemeTickers(themeId, [
      makeTicker(themeId, 'NVDA'),
      makeTicker(themeId, 'AMD'),
    ]);

    const tickers = await repository.findTickersByThemeId(themeId);
    expect(tickers.map((t) => t.ticker)).toEqual(['AMD', 'NVDA']);
  });

  it('keeps the previous tickers when an insert fails midway', async () => {
    await repository.replaceThemeTickers(themeId, [makeTicker(themeId, 'OLD')]);
    const duplicateId = randomUUID();

    await expect(
      repository.replaceThemeTickers(themeId, [
        makeTicker(themeId, 'NVDA', duplicateId),
        makeTicker(themeId, 'AMD', duplicateId),
      ]),
    ).rejects.toThrow();

    const tickers = await repository.findTickersByThemeId(themeId);
    expect(tickers.map((t) => t.ticker)).toEqual(['OLD']);
  });
});
