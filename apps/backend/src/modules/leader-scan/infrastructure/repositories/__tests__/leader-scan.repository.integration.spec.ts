import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { LeaderScanRepository } from '../../../domain/repositories/leader-scan.repository.interface';
import { LeaderScanRepositoryImpl } from '../leader-scan.repository';
import { LeaderScanRun } from '../../../domain/entities/leader-scan-run';
import { LeaderScanResult } from '../../../domain/entities/leader-scan-result';
import { ScanDate } from '../../../domain/value-objects/scan-date';
import { RsScore } from '../../../domain/value-objects/rs-score';
import { LEADER_SCAN_REPOSITORY } from '../../../constants/tokens';

function makeResult(
  symbol: string,
  scanDate: ScanDate,
  overrides: Partial<{
    rsScore: number;
    rank1M: number;
    rank3M: number;
    rank6M: number;
    smallSize: boolean;
  }> = {},
): LeaderScanResult {
  return LeaderScanResult.create({
    symbol,
    scanDate,
    exchange: 'NASDAQ',
    sector: 'Technology',
    perf1M: 0.12,
    perf3M: 0.28,
    perf6M: 0.45,
    rank1M: overrides.rank1M ?? 0.97,
    rank3M: overrides.rank3M ?? 0.99,
    rank6M: overrides.rank6M ?? 0.98,
    rsScore: RsScore.of(overrides.rsScore ?? 0.99),
    adr20: 4.2,
    dollarVolume20: 8_500_000_000,
    top1MFlag: false,
    top3MFlag: true,
    top6MFlag: true,
    smallSizeFlag: overrides.smallSize ?? false,
  });
}

describe('LeaderScanRepository Integration', () => {
  let module: TestingModule;
  let repository: LeaderScanRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        { provide: LEADER_SCAN_REPOSITORY, useClass: LeaderScanRepositoryImpl },
      ],
    }).compile();

    await module.init();

    repository = module.get<LeaderScanRepository>(LEADER_SCAN_REPOSITORY);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM leader_scan_results');
    await databaseService.query('DELETE FROM leader_scan_runs');
  });

  it('should persist a run and its results and read them back', async () => {
    const scanDate = ScanDate.of(new Date('2026-04-24'));
    const run = LeaderScanRun.create(scanDate);
    run.markCompleted(733, 2);

    const results = [
      makeResult('NVDA', scanDate, { rsScore: 0.99 }),
      makeResult('AAPL', scanDate, { rsScore: 0.985 }),
    ];

    await repository.saveRun(run);
    await repository.saveResults(run, results);

    const latest = await repository.getLatestResults();
    expect(latest).toHaveLength(2);
    expect(latest[0].symbol).toBe('NVDA');
    expect(latest[0].rsScore.value).toBeCloseTo(0.99, 5);
    expect(latest[1].symbol).toBe('AAPL');
  });

  it('should replace results for the same scan_date on re-save', async () => {
    const scanDate = ScanDate.of(new Date('2026-04-24'));
    const run = LeaderScanRun.create(scanDate);
    run.markCompleted(733, 1);

    await repository.saveRun(run);
    await repository.saveResults(run, [makeResult('OLD', scanDate)]);
    await repository.saveResults(run, [makeResult('NEW', scanDate)]);

    const latest = await repository.getLatestResults();
    expect(latest.map((r) => r.symbol)).toEqual(['NEW']);
  });

  it('should return null for getLatestResultForSymbol when symbol is absent', async () => {
    const result = await repository.getLatestResultForSymbol('UNKNOWN');
    expect(result).toBeNull();
  });

  it('should return the latest scan for a symbol across multiple scans', async () => {
    const older = ScanDate.of(new Date('2026-04-17'));
    const newer = ScanDate.of(new Date('2026-04-24'));

    const olderRun = LeaderScanRun.create(older);
    olderRun.markCompleted(700, 1);
    const newerRun = LeaderScanRun.create(newer);
    newerRun.markCompleted(733, 1);

    await repository.saveRun(olderRun);
    await repository.saveResults(olderRun, [
      makeResult('NVDA', older, { rsScore: 0.98 }),
    ]);
    await repository.saveRun(newerRun);
    await repository.saveResults(newerRun, [
      makeResult('NVDA', newer, { rsScore: 0.99 }),
    ]);

    const result = await repository.getLatestResultForSymbol('NVDA');
    expect(result).not.toBeNull();
    expect(result!.scanDate.toISOString()).toBe(newer.toISOString());
    expect(result!.rsScore.value).toBeCloseTo(0.99, 5);
  });
});
