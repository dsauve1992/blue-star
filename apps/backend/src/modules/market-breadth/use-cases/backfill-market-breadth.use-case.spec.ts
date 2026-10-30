import { BackfillMarketBreadthUseCase } from './backfill-market-breadth.use-case';
import { MarketBreadthAnalysisService } from '../domain/services/market-breadth-analysis.service';
import { MarketBreadthRepository } from '../domain/repositories/market-breadth.repository.interface';

describe('BackfillMarketBreadthUseCase', () => {
  const calls: string[] = [];
  let analysisService: jest.Mocked<MarketBreadthAnalysisService>;
  let repository: jest.Mocked<MarketBreadthRepository>;
  let useCase: BackfillMarketBreadthUseCase;

  beforeEach(() => {
    calls.length = 0;
    analysisService = {
      runDaily: jest.fn(),
      runBackfill: jest.fn().mockImplementation(() => {
        calls.push('runBackfill');
        return Promise.resolve({
          scanDate: '2026-08-31',
          universeSize: 3400,
          sessionsRecomputed: ['2026-08-28', '2026-08-31'],
          aggregates: [],
        });
      }),
    };
    repository = {
      deleteAll: jest.fn().mockImplementation(() => {
        calls.push('deleteAll');
        return Promise.resolve();
      }),
    } as unknown as jest.Mocked<MarketBreadthRepository>;
    useCase = new BackfillMarketBreadthUseCase(analysisService, repository);
  });

  it('flushes before backfilling and maps the result', async () => {
    const response = await useCase.execute({ sessions: 5, flush: true });

    expect(calls).toEqual(['deleteAll', 'runBackfill']);
    expect(response).toEqual({
      fetchedUniverseSize: 3400,
      sessionsRecomputed: ['2026-08-28', '2026-08-31'],
    });
  });

  it('passes the session count through', async () => {
    await useCase.execute({ sessions: 5, flush: false });

    expect(analysisService.runBackfill).toHaveBeenCalledWith(5);
  });

  it('leaves the session count undefined when omitted', async () => {
    await useCase.execute({ flush: false });

    expect(analysisService.runBackfill).toHaveBeenCalledWith(undefined);
  });

  it('leaves existing data alone without flush', async () => {
    await useCase.execute({ flush: false });

    expect(repository.deleteAll).not.toHaveBeenCalled();
  });
});
