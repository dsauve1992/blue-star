import { MomentumLeadersBreadthUniverseService } from './momentum-leaders-breadth-universe.service';
import { GetLatestMomentumLeaderSymbolsUseCase } from '../../../stock-analysis/use-cases/get-latest-momentum-leader-symbols.use-case';

describe('MomentumLeadersBreadthUniverseService', () => {
  let getLatest: jest.Mocked<GetLatestMomentumLeaderSymbolsUseCase>;
  let service: MomentumLeadersBreadthUniverseService;

  beforeEach(() => {
    getLatest = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetLatestMomentumLeaderSymbolsUseCase>;
    service = new MomentumLeadersBreadthUniverseService(getLatest);
  });

  it('builds the universe from the latest momentum leaders scan', async () => {
    getLatest.execute.mockResolvedValue({
      scanDate: new Date(2026, 9, 14),
      symbols: ['NVDA', 'PLTR'],
    });

    await expect(service.fetchUniverse()).resolves.toEqual({
      scan_date: '2026-10-14',
      universe_size: 2,
      symbols: ['NVDA', 'PLTR'],
    });
  });

  it('fails when no momentum leaders scan exists', async () => {
    getLatest.execute.mockResolvedValue(null);

    await expect(service.fetchUniverse()).rejects.toThrow(
      'no momentum leaders scan',
    );
  });
});
