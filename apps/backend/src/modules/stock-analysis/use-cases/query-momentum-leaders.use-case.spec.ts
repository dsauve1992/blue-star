import { Test } from '@nestjs/testing';
import { QueryMomentumLeadersUseCase } from './query-momentum-leaders.use-case';
import type { MomentumLeaderRepository } from '../domain/repositories/momentum-leader.repository.interface';
import type { ConsolidationResultRepository } from '../domain/repositories/consolidation-result.repository.interface';
import { MomentumLeader } from '../domain/value-objects/momentum-leader';
import { ConsolidationResultEntity } from '../domain/entities/consolidation-result';
import { AnalysisDate } from '../domain/value-objects/analysis-date';
import {
  CONSOLIDATION_RESULT_REPOSITORY,
  MOMENTUM_LEADER_REPOSITORY,
} from '../constants/tokens';
import { GetThemeNamesByTickersUseCase } from '../../themes/themes.module';
import { GetOrFetchStockClassificationUseCase } from '../../stock-classification/stock-classification.module';

type ClassificationMap = Awaited<
  ReturnType<GetOrFetchStockClassificationUseCase['executeMany']>
>;

describe('QueryMomentumLeadersUseCase', () => {
  let useCase: QueryMomentumLeadersUseCase;
  let mockRepository: jest.Mocked<MomentumLeaderRepository>;
  let mockConsolidationRepository: jest.Mocked<ConsolidationResultRepository>;
  let mockThemes: { execute: jest.Mock };
  let mockClassification: { executeMany: jest.Mock };

  const scanDate = new Date('2026-06-20T00:00:00.000Z');

  const leader = (
    symbol: string,
    overrides: Partial<{ scanDate: Date; universeSize: number }> = {},
  ) =>
    MomentumLeader.of({
      symbol,
      exchange: 'NASDAQ',
      sector: 'Technology',
      perf1M: 10,
      perf3M: 20,
      perf6M: 30,
      adrPct: 4,
      rank1M: 1,
      rank3M: 2,
      rank6M: 3,
      rsScore: 95,
      top1M: true,
      top3M: true,
      top6M: false,
      scanDate,
      universeSize: 500,
      ...overrides,
    });

  const consolidation = (symbol: string, timeframe: 'daily' | 'weekly') =>
    ConsolidationResultEntity.create(
      timeframe,
      AnalysisDate.of(scanDate),
      symbol,
      false,
      `${symbol} Inc`,
      'Technology',
      null,
    );

  const classifications = (industryGroupBySymbol: Record<string, string>) =>
    new Map(
      Object.entries(industryGroupBySymbol).map(([symbol, industryGroup]) => [
        symbol,
        { industryGroup },
      ]),
    ) as unknown as ClassificationMap;

  beforeEach(async () => {
    mockRepository = {
      replaceScan: jest.fn(),
      getLatestScan: jest.fn(),
    };
    mockConsolidationRepository = {
      saveResults: jest.fn(),
      getLatestResults: jest.fn(),
      getLatestRun: jest.fn(),
      saveRun: jest.fn(),
    };
    mockThemes = { execute: jest.fn().mockResolvedValue(new Map()) };
    mockClassification = {
      executeMany: jest.fn().mockResolvedValue(new Map()),
    };
    mockConsolidationRepository.getLatestResults.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        QueryMomentumLeadersUseCase,
        { provide: MOMENTUM_LEADER_REPOSITORY, useValue: mockRepository },
        {
          provide: CONSOLIDATION_RESULT_REPOSITORY,
          useValue: mockConsolidationRepository,
        },
        { provide: GetThemeNamesByTickersUseCase, useValue: mockThemes },
        {
          provide: GetOrFetchStockClassificationUseCase,
          useValue: mockClassification,
        },
      ],
    }).compile();

    useCase = module.get(QueryMomentumLeadersUseCase);
  });

  it('returns the empty response without touching consolidation, themes or classification', async () => {
    mockRepository.getLatestScan.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual({
      scanDate: null,
      universeSize: 0,
      count: 0,
      consolidatingCount: 0,
      leaders: [],
    });
    expect(mockConsolidationRepository.getLatestResults).not.toHaveBeenCalled();
    expect(mockThemes.execute).not.toHaveBeenCalled();
    expect(mockClassification.executeMany).not.toHaveBeenCalled();
  });

  it('matches daily consolidation case-insensitively', async () => {
    mockRepository.getLatestScan.mockResolvedValue([leader('NVDA')]);
    mockConsolidationRepository.getLatestResults.mockImplementation(
      (timeframe) =>
        Promise.resolve(
          timeframe === 'daily' ? [consolidation('nvda', 'daily')] : [],
        ),
    );

    const result = await useCase.execute();

    expect(result.leaders[0]).toMatchObject({
      symbol: 'NVDA',
      consolidatingDaily: true,
      consolidatingWeekly: false,
    });
  });

  it('counts a leader consolidating on daily or weekly once', async () => {
    mockRepository.getLatestScan.mockResolvedValue([
      leader('BOTH'),
      leader('DAILY'),
      leader('NONE'),
    ]);
    mockConsolidationRepository.getLatestResults.mockImplementation(
      (timeframe) =>
        Promise.resolve(
          timeframe === 'daily'
            ? [consolidation('BOTH', 'daily'), consolidation('DAILY', 'daily')]
            : [consolidation('BOTH', 'weekly')],
        ),
    );

    const result = await useCase.execute();

    expect(
      result.leaders.map((l) => [
        l.symbol,
        l.consolidatingDaily,
        l.consolidatingWeekly,
      ]),
    ).toEqual([
      ['BOTH', true, true],
      ['DAILY', true, false],
      ['NONE', false, false],
    ]);
    expect(result.consolidatingCount).toBe(2);
  });

  it('joins themes and industry group by uppercased symbol', async () => {
    mockRepository.getLatestScan.mockResolvedValue([
      leader('amd'),
      leader('MISSING'),
    ]);
    mockThemes.execute.mockResolvedValue(new Map([['AMD', ['AI Chips']]]));
    mockClassification.executeMany.mockResolvedValue(
      classifications({ AMD: 'Semiconductors' }),
    );

    const result = await useCase.execute();

    expect(result.leaders[0]).toMatchObject({
      symbol: 'amd',
      themes: ['AI Chips'],
      industryGroup: 'Semiconductors',
    });
    expect(result.leaders[1]).toMatchObject({
      symbol: 'MISSING',
      themes: [],
      industryGroup: null,
    });
  });

  it('takes scanDate and universeSize from the first leader and preserves order', async () => {
    mockRepository.getLatestScan.mockResolvedValue([
      leader('AAA'),
      leader('BBB'),
      leader('CCC', {
        scanDate: new Date('2026-01-02T00:00:00.000Z'),
        universeSize: 42,
      }),
    ]);

    const result = await useCase.execute();

    expect(result.scanDate).toBe('2026-06-20');
    expect(result.universeSize).toBe(500);
    expect(result.count).toBe(3);
    expect(result.leaders.map((l) => l.symbol)).toEqual(['AAA', 'BBB', 'CCC']);
  });
});
