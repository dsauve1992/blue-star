import { Test } from '@nestjs/testing';
import { QueryLeaderBySymbolUseCase } from './query-leader-by-symbol.use-case';
import { LeaderScanRepository } from '../domain/repositories/leader-scan.repository.interface';
import { LeaderScanResult } from '../domain/entities/leader-scan-result';
import { ScanDate } from '../domain/value-objects/scan-date';
import { RsScore } from '../domain/value-objects/rs-score';
import { LEADER_SCAN_REPOSITORY } from '../constants/tokens';

describe('QueryLeaderBySymbolUseCase', () => {
  let useCase: QueryLeaderBySymbolUseCase;
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
        QueryLeaderBySymbolUseCase,
        { provide: LEADER_SCAN_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<QueryLeaderBySymbolUseCase>(
      QueryLeaderBySymbolUseCase,
    );
  });

  it('should return isLeader=false when symbol is not a leader', async () => {
    mockRepo.getLatestResultForSymbol.mockResolvedValue(null);

    const response = await useCase.execute('XYZ');

    expect(response).toEqual({ isLeader: false, leader: null });
  });

  it('should return isLeader=true with DTO when symbol is a leader', async () => {
    const scanDate = ScanDate.of(new Date('2026-04-24'));
    const leader = LeaderScanResult.create({
      symbol: 'AAPL',
      scanDate,
      exchange: 'NASDAQ',
      sector: 'Technology',
      perf1M: 0.05,
      perf3M: 0.15,
      perf6M: 0.25,
      rank1M: 0.93,
      rank3M: 0.99,
      rank6M: 0.97,
      rsScore: RsScore.of(0.99),
      adr20: 3.1,
      dollarVolume20: 10_000_000_000,
      top1MFlag: false,
      top3MFlag: true,
      top6MFlag: false,
      smallSizeFlag: false,
    });
    mockRepo.getLatestResultForSymbol.mockResolvedValue(leader);

    const response = await useCase.execute('AAPL');

    expect(response.isLeader).toBe(true);
    expect(response.leader?.symbol).toBe('AAPL');
    expect(response.leader?.rsScore).toBe(0.99);
    expect(response.leader?.top3MFlag).toBe(true);
  });
});
