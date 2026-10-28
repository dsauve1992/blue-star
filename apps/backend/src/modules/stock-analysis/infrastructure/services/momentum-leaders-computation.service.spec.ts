import { MomentumLeadersComputationServiceImpl } from './momentum-leaders-computation.service';
import {
  MomentumLeaderResult,
  MomentumLeadersScreenerService,
} from '../../domain/services/momentum-leaders-screener.service';
import { MomentumLeaderRepository } from '../../domain/repositories/momentum-leader.repository.interface';
import { MomentumLeader } from '../../domain/value-objects/momentum-leader';

const leaderResult = (symbol: string): MomentumLeaderResult => ({
  symbol,
  exchange: 'NASDAQ',
  sector: 'Technology',
  perf1M: 10,
  perf3M: 20,
  perf6M: 30,
  adrPct: 4,
  rank1M: 1,
  rank3M: 1,
  rank6M: 1,
  rsScore: 99,
  top1M: true,
  top3M: true,
  top6M: true,
});

describe('MomentumLeadersComputationServiceImpl', () => {
  let screener: jest.Mocked<MomentumLeadersScreenerService>;
  let repository: jest.Mocked<MomentumLeaderRepository>;
  let service: MomentumLeadersComputationServiceImpl;

  beforeEach(() => {
    screener = { fetchMomentumLeaders: jest.fn() };
    repository = { replaceScan: jest.fn(), getLatestScan: jest.fn() };
    service = new MomentumLeadersComputationServiceImpl(screener, repository);
  });

  it('rejects an empty scan without replacing the stored scan', async () => {
    screener.fetchMomentumLeaders.mockResolvedValue({
      scanDate: '2026-10-15',
      universeSize: 0,
      leaders: [],
    });

    await expect(service.computeMomentumLeaders()).rejects.toThrow(
      'Momentum leaders scan returned no leaders (universe size 0)',
    );
    expect(repository.replaceScan).not.toHaveBeenCalled();
  });

  it('replaces the stored scan with the screened leaders', async () => {
    screener.fetchMomentumLeaders.mockResolvedValue({
      scanDate: '2026-10-15',
      universeSize: 3000,
      leaders: [leaderResult('NVDA'), leaderResult('AVGO')],
    });

    await service.computeMomentumLeaders();

    expect(repository.replaceScan).toHaveBeenCalledTimes(1);
    const [scanDate, leaders] = repository.replaceScan.mock.calls[0];
    expect(scanDate).toEqual(new Date('2026-10-15'));
    expect(leaders).toHaveLength(2);
    expect(leaders.every((l) => l instanceof MomentumLeader)).toBe(true);
    expect(leaders.map((l) => l.symbol)).toEqual(['NVDA', 'AVGO']);
    expect(leaders.every((l) => l.universeSize === 3000)).toBe(true);
  });
});
