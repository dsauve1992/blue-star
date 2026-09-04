import { Test } from '@nestjs/testing';
import { LeaderScanAnalysisServiceImpl } from './leader-scan-analysis.service';
import { LeaderScanScreenerService } from '../../domain/services/leader-scan-screener.service';
import { LeaderScanRepository } from '../../domain/repositories/leader-scan.repository.interface';
import { LeaderScanRunStatus } from '../../domain/value-objects/leader-scan-run-status';
import { ScanDate } from '../../domain/value-objects/scan-date';
import {
  LEADER_SCAN_REPOSITORY,
  LEADER_SCAN_SCREENER_SERVICE,
} from '../../constants/tokens';

describe('LeaderScanAnalysisServiceImpl', () => {
  let service: LeaderScanAnalysisServiceImpl;
  let mockScreener: jest.Mocked<LeaderScanScreenerService>;
  let mockRepo: jest.Mocked<LeaderScanRepository>;

  beforeEach(async () => {
    mockScreener = {
      runScan: jest.fn(),
    } as jest.Mocked<LeaderScanScreenerService>;

    mockRepo = {
      saveRun: jest.fn().mockResolvedValue(undefined),
      saveResults: jest.fn().mockResolvedValue(undefined),
      getLatestResults: jest.fn(),
      getResultsForDate: jest.fn(),
      getLatestResultForSymbol: jest.fn(),
    } as jest.Mocked<LeaderScanRepository>;

    const module = await Test.createTestingModule({
      providers: [
        LeaderScanAnalysisServiceImpl,
        { provide: LEADER_SCAN_SCREENER_SERVICE, useValue: mockScreener },
        { provide: LEADER_SCAN_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(LeaderScanAnalysisServiceImpl);
  });

  it('should run the screener, persist results, and mark run completed', async () => {
    mockScreener.runScan.mockResolvedValue({
      scan_date: '2026-04-24',
      universe_size: 733,
      leader_count: 1,
      results: [
        {
          ticker: 'NVDA',
          exchange: 'NASDAQ',
          sector: 'Technology',
          perf_1m: 0.12,
          perf_3m: 0.28,
          perf_6m: 0.45,
          rank_1m: 0.97,
          rank_3m: 0.99,
          rank_6m: 0.98,
          rs_score: 0.99,
          adr_20: 4.2,
          dollar_volume_20: 8_500_000_000,
          top_1m_flag: false,
          top_3m_flag: true,
          top_6m_flag: true,
          small_size_flag: false,
        },
      ],
    });

    const scanDate = ScanDate.of(new Date('2026-04-24'));
    const run = await service.runAnalysis(scanDate);

    expect(run.status).toBe(LeaderScanRunStatus.COMPLETED);
    expect(run.universeSize).toBe(733);
    expect(run.leaderCount).toBe(1);
    expect(mockRepo.saveRun).toHaveBeenCalledTimes(2); // initial + after completion
    expect(mockRepo.saveResults).toHaveBeenCalledTimes(1);
  });

  it('should mark run failed and rethrow when screener throws', async () => {
    mockScreener.runScan.mockRejectedValue(new Error('TV timeout'));

    await expect(
      service.runAnalysis(ScanDate.of(new Date('2026-04-24'))),
    ).rejects.toThrow('TV timeout');

    const savedRun = mockRepo.saveRun.mock.calls.at(-1)?.[0];
    expect(savedRun?.status).toBe(LeaderScanRunStatus.FAILED);
    expect(savedRun?.errorMessage).toBe('TV timeout');
    expect(mockRepo.saveResults).not.toHaveBeenCalled();
  });
});
