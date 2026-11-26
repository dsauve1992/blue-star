import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { PotentScanRepository } from '../../../domain/repositories/potent-scan.repository.interface';
import { PotentScanRepositoryImpl } from '../potent-scan.repository';
import { POTENT_SCAN_REPOSITORY } from '../../../constants/tokens';
import { PotentScan } from '../../../domain/entities/potent-scan';
import { SessionDate } from '../../../domain/value-objects/session-date';
import { hit, nearMiss } from '../../../test/fixtures';

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
