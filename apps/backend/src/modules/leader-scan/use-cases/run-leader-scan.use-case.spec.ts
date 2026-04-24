import { Test } from '@nestjs/testing';
import { RunLeaderScanUseCase } from './run-leader-scan.use-case';
import { LeaderScanAnalysisService } from '../domain/services/leader-scan-analysis.service';
import { LeaderScanRun } from '../domain/entities/leader-scan-run';
import { ScanDate } from '../domain/value-objects/scan-date';
import { LEADER_SCAN_ANALYSIS_SERVICE } from '../constants/tokens';

describe('RunLeaderScanUseCase', () => {
  let useCase: RunLeaderScanUseCase;
  let mockService: jest.Mocked<LeaderScanAnalysisService>;

  beforeEach(async () => {
    mockService = {
      runAnalysis: jest.fn(),
    } as jest.Mocked<LeaderScanAnalysisService>;

    const module = await Test.createTestingModule({
      providers: [
        RunLeaderScanUseCase,
        { provide: LEADER_SCAN_ANALYSIS_SERVICE, useValue: mockService },
      ],
    }).compile();

    useCase = module.get<RunLeaderScanUseCase>(RunLeaderScanUseCase);
  });

  it('should run analysis for today and return a summary DTO', async () => {
    const scanDate = ScanDate.of(new Date('2026-04-24'));
    const run = LeaderScanRun.create(scanDate);
    run.markCompleted(733, 28);
    mockService.runAnalysis.mockResolvedValue(run);

    const response = await useCase.execute();

    expect(mockService.runAnalysis).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      scanDate: run.scanDate.toISOString(),
      universeSize: 733,
      leaderCount: 28,
      status: 'completed',
    });
  });
});
