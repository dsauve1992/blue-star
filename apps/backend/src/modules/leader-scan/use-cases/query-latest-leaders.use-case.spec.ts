import { Test } from '@nestjs/testing';
import { QueryLatestLeadersUseCase } from './query-latest-leaders.use-case';
import { LeaderScanRepository } from '../domain/repositories/leader-scan.repository.interface';
import { LeaderScanResult } from '../domain/entities/leader-scan-result';
import { ScanDate } from '../domain/value-objects/scan-date';
import { RsScore } from '../domain/value-objects/rs-score';
import { LEADER_SCAN_REPOSITORY } from '../constants/tokens';

describe('QueryLatestLeadersUseCase', () => {
  let useCase: QueryLatestLeadersUseCase;
  let mockRepo: jest.Mocked<LeaderScanRepository>;

  beforeEach(async () => {
    mockRepo = {
      saveRun: jest.fn(),
      saveResults: jest.fn(),
      getLatestResults: jest.fn(),
      getResultsForDate: jest.fn(),
      getLatestResultForSymbol: jest.fn(),
    } as jest.Mocked<LeaderScanRepository>;

    const module = await Test.createTestingModule({
      providers: [
        QueryLatestLeadersUseCase,
        { provide: LEADER_SCAN_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<QueryLatestLeadersUseCase>(QueryLatestLeadersUseCase);
  });

  it('should return empty response when no leaders exist', async () => {
    mockRepo.getLatestResults.mockResolvedValue([]);

    const response = await useCase.execute();

    expect(response).toEqual({ scanDate: null, count: 0, leaders: [] });
  });

  it('should map repository entities to DTOs', async () => {
    const scanDate = ScanDate.of(new Date('2026-04-24'));
    const leader = LeaderScanResult.create({
      symbol: 'NVDA',
      scanDate,
      exchange: 'NASDAQ',
      sector: 'Technology',
      perf1M: 0.12,
      perf3M: 0.28,
      perf6M: 0.45,
      rank1M: 0.97,
      rank3M: 0.99,
      rank6M: 0.98,
      rsScore: RsScore.of(0.99),
      adr20: 4.2,
      dollarVolume20: 8_500_000_000,
      top1MFlag: false,
      top3MFlag: true,
      top6MFlag: true,
      smallSizeFlag: false,
    });
    mockRepo.getLatestResults.mockResolvedValue([leader]);

    const response = await useCase.execute();

    expect(response.count).toBe(1);
    expect(response.scanDate).toBe(scanDate.toISOString());
    expect(response.leaders[0]).toEqual({
      symbol: 'NVDA',
      scanDate: scanDate.toISOString(),
      exchange: 'NASDAQ',
      sector: 'Technology',
      perf1M: 0.12,
      perf3M: 0.28,
      perf6M: 0.45,
      rank1M: 0.97,
      rank3M: 0.99,
      rank6M: 0.98,
      rsScore: 0.99,
      adr20: 4.2,
      dollarVolume20: 8_500_000_000,
      top1MFlag: false,
      top3MFlag: true,
      top6MFlag: true,
      smallSizeFlag: false,
    });
  });
});
