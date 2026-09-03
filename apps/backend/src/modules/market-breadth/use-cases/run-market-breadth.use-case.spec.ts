import { RunMarketBreadthUseCase } from './run-market-breadth.use-case';
import { MarketBreadthAnalysisService } from '../domain/services/market-breadth-analysis.service';

describe('RunMarketBreadthUseCase', () => {
  it('delegates to the analysis service and maps the result', async () => {
    const analysisService: jest.Mocked<MarketBreadthAnalysisService> = {
      runDaily: jest.fn().mockResolvedValue({
        scanDate: '2026-08-31',
        universeSize: 3400,
        sessionsRecomputed: ['2026-08-27', '2026-08-28', '2026-08-31'],
        aggregates: [],
      }),
      runBackfill: jest.fn(),
    };
    const useCase = new RunMarketBreadthUseCase(analysisService);

    const response = await useCase.execute();

    expect(analysisService.runDaily).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      scanDate: '2026-08-31',
      fetchedUniverseSize: 3400,
      sessionsRecomputed: ['2026-08-27', '2026-08-28', '2026-08-31'],
    });
  });
});
