import type { Server } from 'http';
import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TradingViewSymbolSearchService } from '../infrastructure/services/tradingview-symbol-search.service';
import { AddTickerToWatchlistUseCase } from '../use-cases/add-ticker-to-watchlist.use-case';
import { CreateWatchlistUseCase } from '../use-cases/create-watchlist.use-case';
import { DeleteWatchlistUseCase } from '../use-cases/delete-watchlist.use-case';
import { GetWatchlistByIdUseCase } from '../use-cases/get-watchlist-by-id.use-case';
import { ListWatchlistsUseCase } from '../use-cases/list-watchlists.use-case';
import { RemoveTickerFromWatchlistUseCase } from '../use-cases/remove-ticker-from-watchlist.use-case';
import { RenameWatchlistUseCase } from '../use-cases/rename-watchlist.use-case';
import { WatchlistApiMapper } from './watchlist-api.mapper';
import { WatchlistController } from './watchlist.controller';

describe('WatchlistController symbol-search', () => {
  let app: INestApplication;
  const search = jest.fn();
  const server = () => app.getHttpServer() as Server;
  const unused = (provide: Type) => ({ provide, useValue: {} });

  beforeEach(async () => {
    search.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [
        { provide: TradingViewSymbolSearchService, useValue: { search } },
        unused(CreateWatchlistUseCase),
        unused(AddTickerToWatchlistUseCase),
        unused(RemoveTickerFromWatchlistUseCase),
        unused(DeleteWatchlistUseCase),
        unused(RenameWatchlistUseCase),
        unused(ListWatchlistsUseCase),
        unused(GetWatchlistByIdUseCase),
        unused(WatchlistApiMapper),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a repeated q with 400', async () => {
    const response = await request(server()).get(
      '/watchlists/symbol-search?q=ab&q=cd',
    );

    expect(response.status).toBe(400);
    expect(search).not.toHaveBeenCalled();
  });

  it('returns no results when q is missing', async () => {
    const response = await request(server()).get('/watchlists/symbol-search');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ results: [] });
    expect(search).not.toHaveBeenCalled();
  });

  it('returns no results when q is a single character', async () => {
    const response = await request(server()).get(
      '/watchlists/symbol-search?q=a',
    );

    expect(response.body).toEqual({ results: [] });
    expect(search).not.toHaveBeenCalled();
  });

  it('searches with the trimmed q', async () => {
    search.mockResolvedValue([{ symbol: 'AAPL' }]);

    const response = await request(server()).get(
      '/watchlists/symbol-search?q=%20aapl%20',
    );

    expect(search).toHaveBeenCalledWith('aapl');
    expect(response.body).toEqual({ results: [{ symbol: 'AAPL' }] });
  });
});
