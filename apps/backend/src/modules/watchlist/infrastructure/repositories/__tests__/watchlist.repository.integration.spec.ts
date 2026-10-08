import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { Watchlist } from '../../../domain/entities/watchlist';
import { WatchlistId } from '../../../domain/value-objects/watchlist-id';
import { WatchlistName } from '../../../domain/value-objects/watchlist-name';
import { WatchlistTicker } from '../../../domain/value-objects/watchlist-ticker';
import { UserId } from '../../../../../shared/value-objects/user-id';
import { WatchlistReadRepository as IWatchlistReadRepository } from '../../../domain/repositories/watchlist-read.repository.interface';
import { WatchlistWriteRepository as IWatchlistWriteRepository } from '../../../domain/repositories/watchlist-write.repository.interface';
import {
  WATCHLIST_READ_REPOSITORY,
  WATCHLIST_WRITE_REPOSITORY,
} from '../../../constants/tokens';
import { WatchlistReadRepository } from '../watchlist-read.repository';
import { WatchlistWriteRepository } from '../watchlist-write.repository';

describe('Watchlist Repositories Integration', () => {
  let module: TestingModule;
  let databaseService: DatabaseService;
  let writeRepository: IWatchlistWriteRepository;
  let readRepository: IWatchlistReadRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        {
          provide: WATCHLIST_WRITE_REPOSITORY,
          useClass: WatchlistWriteRepository,
        },
        {
          provide: WATCHLIST_READ_REPOSITORY,
          useClass: WatchlistReadRepository,
        },
      ],
    }).compile();

    await module.init();

    databaseService = module.get(DatabaseService);
    writeRepository = module.get<IWatchlistWriteRepository>(
      WATCHLIST_WRITE_REPOSITORY,
    );
    readRepository = module.get<IWatchlistReadRepository>(
      WATCHLIST_READ_REPOSITORY,
    );
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM watchlist_tickers');
    await databaseService.query('DELETE FROM watchlists');
  });

  it('returns tickers in the same deterministic order from both repositories', async () => {
    const now = new Date();
    const watchlist = Watchlist.fromData({
      id: WatchlistId.of('11111111-1111-4111-8111-111111111111'),
      userId: UserId.of('user-1'),
      name: WatchlistName.of('Tech'),
      tickers: ['MSFT', 'AAPL', 'NVDA'].map((t) => WatchlistTicker.of(t)),
      createdAt: now,
      updatedAt: now,
    });

    await writeRepository.save(watchlist);

    const written = await writeRepository.getById(watchlist.id);
    const read = await readRepository.findById(watchlist.id);
    expect(written.tickers).toEqual(
      ['AAPL', 'MSFT', 'NVDA'].map((t) => WatchlistTicker.of(t)),
    );
    expect(read?.tickers).toEqual(written.tickers);
  });
});
