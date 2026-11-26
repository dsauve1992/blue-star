import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { PotentScanRepository } from '../../../domain/repositories/potent-scan.repository.interface';
import { PotentScanRepositoryImpl } from '../potent-scan.repository';
import { POTENT_SCAN_REPOSITORY } from '../../../constants/tokens';
import { PotentScan } from '../../../domain/entities/potent-scan';
import { SessionDate } from '../../../domain/value-objects/session-date';
import { hit, nearMiss } from '../../../test/fixtures';
import { HitResearchRepositoryImpl } from '../hit-research.repository';
import { HIT_RESEARCH_REPOSITORY } from '../../../constants/tokens';
import { HitResearchRepository } from '../../../domain/repositories/hit-research.repository.interface';
import {
  HitResearch,
  ResearchRun,
} from '../../../domain/value-objects/hit-research';

describe('PotentScanRepository Integration', () => {
  let module: TestingModule;
  let repository: PotentScanRepository;
  let databaseService: DatabaseService;

  const scanFor = (date: string, symbols: string[]) =>
    PotentScan.of({
      sessionDate: SessionDate.of(date),
      universeSize: 2400,
      hits: symbols.map((symbol, i) => hit(symbol, { changePct: 20 - i })),
      nearMisses: [nearMiss(`${symbols[0]}X`)],
    });

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        { provide: POTENT_SCAN_REPOSITORY, useClass: PotentScanRepositoryImpl },
      ],
    }).compile();

    await module.init();

    repository = module.get<PotentScanRepository>(POTENT_SCAN_REPOSITORY);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM potent_scans');
  });

  it('should round-trip a scan with every hit and near-miss field', async () => {
    const scan = PotentScan.of({
      sessionDate: SessionDate.of('2026-11-25'),
      universeSize: 2400,
      hits: [
        hit('AAA', { changePct: 15.25 }),
        hit('BBB', {
          changePct: 9.5,
          tier: null,
          adrPct: null,
          ema9: null,
          relativeVolume: null,
          marketCap: null,
          close: null,
        }),
      ],
      nearMisses: [nearMiss('CCC', { valueTraded: null })],
    });

    await repository.replace(scan);

    expect(
      await repository.findBySessionDate(SessionDate.of('2026-11-25')),
    ).toEqual(scan);
  });

  it('should replace the scan of a session that is run again', async () => {
    await repository.replace(scanFor('2026-11-25', ['AAA', 'BBB']));
    const rerun = scanFor('2026-11-25', ['CCC']);

    await repository.replace(rerun);

    expect(
      await repository.findBySessionDate(SessionDate.of('2026-11-25')),
    ).toEqual(rerun);
    const hits = await databaseService.query(
      'SELECT COUNT(*)::int AS count FROM potent_scan_hits',
    );
    expect(hits.rows[0]).toEqual({ count: 1 });
  });

  it('should return the latest scan and list sessions newest first', async () => {
    await repository.replace(scanFor('2026-11-24', ['AAA']));
    const latest = scanFor('2026-11-25', ['BBB']);
    await repository.replace(latest);

    expect(await repository.findLatest()).toEqual(latest);
    expect(await repository.listSessionDates()).toEqual([
      SessionDate.of('2026-11-25'),
      SessionDate.of('2026-11-24'),
    ]);
  });

  it('should tell whether a session is stored', async () => {
    await repository.replace(scanFor('2026-11-25', ['AAA']));

    expect(await repository.exists(SessionDate.of('2026-11-25'))).toBe(true);
    expect(await repository.exists(SessionDate.of('2026-11-24'))).toBe(false);
  });

  it('should return null when no scan is stored', async () => {
    expect(await repository.findLatest()).toBeNull();
    expect(
      await repository.findBySessionDate(SessionDate.of('2026-11-25')),
    ).toBeNull();
  });
});

interface RunRow {
  scan_date: string;
  status: string;
  hit_count: number;
  researched_count: number;
  missing_symbols: string[];
  headline_fetch_errors: string[];
  input_tokens: number;
  output_tokens: number;
  web_search_requests: number;
  cost_usd: string;
  error: string | null;
}

describe('HitResearchRepository Integration', () => {
  let module: TestingModule;
  let repository: HitResearchRepository;
  let scanRepository: PotentScanRepository;
  let databaseService: DatabaseService;

  const SESSION = SessionDate.of('2026-11-25');

  const research = (
    symbol: string,
    overrides: Partial<HitResearch> = {},
  ): HitResearch => ({
    symbol,
    business: `${symbol} makes chips`,
    catalystToday: 'Beat and raised',
    catalystType: 'earnings',
    source: `https://news.example.com/${symbol}`,
    model: 'claude-haiku-5-5',
    ...overrides,
  });

  const run = (overrides: Partial<ResearchRun> = {}): ResearchRun => ({
    scanDate: SESSION,
    status: 'succeeded',
    hitCount: 2,
    researchedCount: 2,
    missingSymbols: [],
    headlineFetchErrors: ['CCC: Yahoo down'],
    usage: {
      inputTokens: 12000,
      outputTokens: 1500,
      webSearchRequests: 2,
      costUsd: 0.02095,
    },
    error: null,
    startedAt: new Date('2026-11-25T22:50:00.000Z'),
    finishedAt: new Date('2026-11-25T22:51:00.000Z'),
    ...overrides,
  });

  const saveScan = () =>
    scanRepository.replace(
      PotentScan.of({
        sessionDate: SESSION,
        universeSize: 2400,
        hits: [hit('AAA'), hit('BBB')],
        nearMisses: [],
      }),
    );

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        {
          provide: HIT_RESEARCH_REPOSITORY,
          useClass: HitResearchRepositoryImpl,
        },
        { provide: POTENT_SCAN_REPOSITORY, useClass: PotentScanRepositoryImpl },
      ],
    }).compile();

    await module.init();

    repository = module.get(HIT_RESEARCH_REPOSITORY);
    scanRepository = module.get(POTENT_SCAN_REPOSITORY);
    databaseService = module.get(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM potent_research_runs');
    await databaseService.query('DELETE FROM potent_scans');
    await saveScan();
  });

  it('should round-trip research and record the run with its usage and cost', async () => {
    await repository.saveRun(
      [
        research('BBB', { catalystType: 'none', source: null }),
        research('AAA'),
      ],
      run(),
    );

    expect(await repository.findByScanDate(SESSION)).toEqual([
      research('AAA'),
      research('BBB', { catalystType: 'none', source: null }),
    ]);
    const runs = (await databaseService.query(
      `SELECT scan_date::text AS scan_date, status, hit_count, researched_count, missing_symbols,
              headline_fetch_errors,
              input_tokens, output_tokens, web_search_requests, cost_usd, error
       FROM potent_research_runs`,
    )) as { rows: RunRow[] };
    expect(runs.rows).toEqual([
      {
        scan_date: '2026-11-25',
        status: 'succeeded',
        hit_count: 2,
        researched_count: 2,
        missing_symbols: [],
        headline_fetch_errors: ['CCC: Yahoo down'],
        input_tokens: 12000,
        output_tokens: 1500,
        web_search_requests: 2,
        cost_usd: '0.020950',
        error: null,
      },
    ]);
  });

  it('should replace the research of a re-run and keep every run record', async () => {
    await repository.saveRun(
      [research('AAA')],
      run({
        status: 'failed',
        researchedCount: 1,
        missingSymbols: ['BBB'],
        error: 'overloaded',
      }),
    );
    await repository.saveRun([research('AAA'), research('BBB')], run());

    expect(
      (await repository.findByScanDate(SESSION)).map((r) => r.symbol),
    ).toEqual(['AAA', 'BBB']);
    const runs = (await databaseService.query(
      'SELECT status, missing_symbols FROM potent_research_runs ORDER BY started_at, status',
    )) as { rows: Pick<RunRow, 'status' | 'missing_symbols'>[] };
    expect(runs.rows).toEqual([
      { status: 'failed', missing_symbols: ['BBB'] },
      { status: 'succeeded', missing_symbols: [] },
    ]);
  });

  it('should drop the research with its scan when the scan is replaced, but keep the run records', async () => {
    await repository.saveRun([research('AAA'), research('BBB')], run());

    await saveScan();

    expect(await repository.findByScanDate(SESSION)).toEqual([]);
    const runs = (await databaseService.query(
      'SELECT COUNT(*)::int AS count FROM potent_research_runs',
    )) as { rows: { count: number }[] };
    expect(runs.rows[0].count).toBe(1);
  });

  it('should record a run without touching the stored research', async () => {
    await repository.saveRun([research('AAA'), research('BBB')], run());

    await repository.recordRun(
      run({
        status: 'failed',
        researchedCount: 0,
        error: 'Headline fetch failed',
      }),
    );

    expect(
      (await repository.findByScanDate(SESSION)).map((r) => r.symbol),
    ).toEqual(['AAA', 'BBB']);
    const runs = (await databaseService.query(
      'SELECT status, error FROM potent_research_runs ORDER BY status DESC',
    )) as { rows: Pick<RunRow, 'status' | 'error'>[] };
    expect(runs.rows).toEqual([
      { status: 'succeeded', error: null },
      { status: 'failed', error: 'Headline fetch failed' },
    ]);
  });
});
