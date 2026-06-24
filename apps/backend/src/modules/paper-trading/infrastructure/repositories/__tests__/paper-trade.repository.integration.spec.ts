import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { PaperTradeWriteRepository } from '../paper-trade-write.repository';
import { PaperTradeReadRepository } from '../paper-trade-read.repository';
import {
  PaperTrade,
  PaperTradeExitReason,
  PaperTradeStatus,
} from '../../../domain/entities/paper-trade';
import { Shares } from '../../../domain/value-objects/shares';
import { WatchlistTicker } from '../../../../watchlist/domain/value-objects/watchlist-ticker';
import { UuidGeneratorService } from '../../../../../shared/services/uuid-generator.service';

describe('PaperTrade repositories Integration', () => {
  let module: TestingModule;
  let writeRepository: PaperTradeWriteRepository;
  let readRepository: PaperTradeReadRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    let uuidCounter = 0;
    jest.spyOn(UuidGeneratorService, 'generate').mockImplementation(() => {
      const baseUuid = '550e8400-e29b-41d4-a716-44665544100';
      return `${baseUuid}${uuidCounter++}`;
    });

    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        PaperTradeWriteRepository,
        PaperTradeReadRepository,
      ],
    }).compile();

    await module.init();

    writeRepository = module.get(PaperTradeWriteRepository);
    readRepository = module.get(PaperTradeReadRepository);
    databaseService = module.get(DatabaseService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM paper_trades');
  });

  function openTrade(
    ticker: string,
    overrides: Partial<{
      entryPrice: number;
      stopPrice: number;
      targetPrice: number;
      shares: number;
    }> = {},
  ): PaperTrade {
    const {
      entryPrice = 108,
      stopPrice = 100,
      targetPrice = 156,
      shares = 6,
    } = overrides;
    return PaperTrade.open({
      ticker: WatchlistTicker.of(ticker),
      entryPrice,
      stopPrice,
      targetPrice,
      shares: Shares.of(shares),
      marketDate: '2026-06-24',
      openedAt: new Date('2026-06-24T13:35:00.000Z'),
    });
  }

  it('saves an open trade and reads it back unchanged', async () => {
    const trade = openTrade('AAPL');

    await writeRepository.save(trade);
    const found = await readRepository.findById(trade.id.value);

    expect(found).not.toBeNull();
    expect(found!.ticker.value).toBe('AAPL');
    expect(found!.status).toBe(PaperTradeStatus.OPEN);
    expect(found!.entryPrice).toBe(108);
    expect(found!.stopPrice).toBe(100);
    expect(found!.targetPrice).toBe(156);
    expect(found!.shares.value).toBe(6);
    expect(found!.riskPerShare).toBe(8);
  });

  it('persists a close (exit price, reason, pnl, realizedR)', async () => {
    const trade = openTrade('AAPL');
    await writeRepository.save(trade);

    trade.close(
      156,
      PaperTradeExitReason.TARGET,
      new Date('2026-06-25T14:00:00.000Z'),
    );
    await writeRepository.save(trade);

    const found = await readRepository.findById(trade.id.value);
    expect(found!.status).toBe(PaperTradeStatus.CLOSED);
    expect(found!.exitPrice).toBe(156);
    expect(found!.exitReason).toBe(PaperTradeExitReason.TARGET);
    expect(found!.pnl).toBe(288);
    expect(found!.realizedR).toBe(6);
  });

  it('reports an open trade for a ticker via hasOpenTrade', async () => {
    await writeRepository.save(openTrade('AAPL'));

    expect(await readRepository.hasOpenTrade(WatchlistTicker.of('AAPL'))).toBe(
      true,
    );
    expect(await readRepository.hasOpenTrade(WatchlistTicker.of('MSFT'))).toBe(
      false,
    );
  });

  it('derives realized pnl from closed trades only', async () => {
    const winner = openTrade('AAPL');
    await writeRepository.save(winner);
    winner.close(156, PaperTradeExitReason.TARGET, new Date());
    await writeRepository.save(winner);

    const loser = openTrade('MSFT');
    await writeRepository.save(loser);
    loser.close(100, PaperTradeExitReason.STOP, new Date());
    await writeRepository.save(loser);

    const stillOpen = openTrade('NVDA');
    await writeRepository.save(stillOpen);

    // 288 (winner) + (-48) (loser); open NVDA not counted
    expect(await readRepository.getRealizedPnl()).toBe(240);
  });

  it('sums committed cash from open trades only', async () => {
    await writeRepository.save(openTrade('AAPL', { shares: 6 })); // 108 * 6 = 648
    const closed = openTrade('MSFT', { shares: 10 });
    await writeRepository.save(closed);
    closed.close(156, PaperTradeExitReason.TARGET, new Date());
    await writeRepository.save(closed);

    expect(await readRepository.getCommittedCash()).toBe(648);
  });

  it('rejects a second open trade for the same ticker (partial unique index)', async () => {
    await writeRepository.save(openTrade('AAPL'));

    await expect(writeRepository.save(openTrade('AAPL'))).rejects.toThrow();
  });
});
