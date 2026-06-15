import { Test } from '@nestjs/testing';
import { QueryLeaderBreadthUseCase } from './query-leader-breadth.use-case';
import { LeaderScanRepository } from '../domain/repositories/leader-scan.repository.interface';
import { BreadthRegimeValue } from '../domain/value-objects/breadth-regime';
import { LEADER_SCAN_REPOSITORY } from '../constants/tokens';

describe('QueryLeaderBreadthUseCase', () => {
  let useCase: QueryLeaderBreadthUseCase;
  let mockRepo: jest.Mocked<LeaderScanRepository>;

  beforeEach(async () => {
    mockRepo = {
      saveRun: jest.fn(),
      saveResults: jest.fn(),
      getLatestResults: jest.fn(),
      getResultsForDate: jest.fn(),
      getLatestResultForSymbol: jest.fn(),
      getRecentCompletedRuns: jest.fn(),
    } as jest.Mocked<LeaderScanRepository>;

    const module = await Test.createTestingModule({
      providers: [
        QueryLeaderBreadthUseCase,
        { provide: LEADER_SCAN_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<QueryLeaderBreadthUseCase>(QueryLeaderBreadthUseCase);
  });

  it('returns an empty/provisional response when no runs exist', async () => {
    mockRepo.getRecentCompletedRuns.mockResolvedValue([]);

    const response = await useCase.execute();

    expect(response).toEqual({
      scanDate: null,
      regime: null,
      leaderCount: null,
      breadthMa: null,
      leaderPct: null,
      direction: null,
      sampleSize: 0,
      provisional: true,
      series: [],
    });
  });

  it('classifies an expanding, above-average breadth as GREEN', async () => {
    mockRepo.getRecentCompletedRuns.mockResolvedValue([
      { scanDate: '2026-04-03', leaderCount: 100, universeSize: 4000 },
      { scanDate: '2026-04-10', leaderCount: 100, universeSize: 4000 },
      { scanDate: '2026-04-17', leaderCount: 100, universeSize: 4000 },
      { scanDate: '2026-04-24', leaderCount: 200, universeSize: 4000 },
    ]);

    const response = await useCase.execute();

    expect(response.regime).toBe(BreadthRegimeValue.GREEN);
    expect(response.scanDate).toBe('2026-04-24');
    expect(response.leaderCount).toBe(200);
    expect(response.breadthMa).toBe(125);
    expect(response.leaderPct).toBeCloseTo(0.05, 6);
    expect(response.direction).toBe('RISING');
    expect(response.sampleSize).toBe(4);
    expect(response.provisional).toBe(true); // < confidence threshold
    expect(response.series).toHaveLength(4);
    expect(response.series[3]).toEqual({
      scanDate: '2026-04-24',
      leaderCount: 200,
      leaderPct: 0.05,
    });
  });

  it('requests the configured lookback window from the repository', async () => {
    mockRepo.getRecentCompletedRuns.mockResolvedValue([]);

    await useCase.execute();

    expect(mockRepo.getRecentCompletedRuns).toHaveBeenCalledWith(20);
  });
});
