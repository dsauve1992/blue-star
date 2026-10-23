import type { Server } from 'http';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DomainErrorFilter } from '../../../common/filters/domain-error.filter';
import { GetChartDataUseCase } from '../use-cases/get-chart-data.use-case';
import { GetCompanyProfileUseCase } from '../use-cases/get-company-profile.use-case';
import { GetHistoricalDataUseCase } from '../use-cases/get-historical-data.use-case';
import { GetIntradayDataUseCase } from '../use-cases/get-intraday-data.use-case';
import { MarketDataApiMapper } from './market-data-api.mapper';
import { MarketDataController } from './market-data.controller';

describe('MarketDataController', () => {
  let app: INestApplication;
  const historical = jest.fn();
  const profile = jest.fn();
  const chart = jest.fn();
  const intraday = jest.fn();
  const server = () => app.getHttpServer() as Server;
  const messageOf = (response: request.Response) =>
    (response.body as { message: string }).message;
  const upstreamError = () => new Error('TradingView chart error: timeout');

  beforeEach(async () => {
    [historical, profile, chart, intraday].forEach((mock) => mock.mockReset());
    const moduleRef = await Test.createTestingModule({
      controllers: [MarketDataController],
      providers: [
        MarketDataApiMapper,
        {
          provide: GetHistoricalDataUseCase,
          useValue: { execute: historical },
        },
        { provide: GetCompanyProfileUseCase, useValue: { execute: profile } },
        { provide: GetChartDataUseCase, useValue: { execute: chart } },
        { provide: GetIntradayDataUseCase, useValue: { execute: intraday } },
        { provide: APP_FILTER, useClass: DomainErrorFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 500 when the chart use case fails upstream', async () => {
    chart.mockRejectedValue(upstreamError());

    await request(server())
      .get('/market-data/chart?symbol=AAPL&exchange=NASDAQ&interval=D')
      .expect(500);
  });

  it('returns 500 when the historical use case fails upstream', async () => {
    historical.mockRejectedValue(upstreamError());

    await request(server())
      .get(
        '/market-data/historical?symbol=AAPL&startDate=2026-01-01&endDate=2026-02-01',
      )
      .expect(500);
  });

  it('returns 500 when the intraday use case fails upstream', async () => {
    intraday.mockRejectedValue(upstreamError());

    await request(server())
      .get(
        '/market-data/intraday?symbol=AAPL&startDate=2026-01-01&endDate=2026-01-02',
      )
      .expect(500);
  });

  it('returns 500 when the profile use case fails upstream', async () => {
    profile.mockRejectedValue(upstreamError());

    await request(server()).get('/market-data/profile?symbol=AAPL').expect(500);
  });

  it('returns 400 with the validation message for an invalid chart interval', async () => {
    const response = await request(server())
      .get('/market-data/chart?symbol=AAPL&exchange=NASDAQ&interval=X')
      .expect(400);

    expect(messageOf(response)).toContain('Invalid interval');
    expect(chart).not.toHaveBeenCalled();
  });

  it.each(['abc', '0'])(
    'returns 400 with the validation message for bars=%s',
    async (bars) => {
      const response = await request(server())
        .get(`/market-data/chart?symbol=AAPL&exchange=NASDAQ&bars=${bars}`)
        .expect(400);

      expect(messageOf(response)).toContain('bars');
      expect(chart).not.toHaveBeenCalled();
    },
  );

  it('returns 400 with the validation message for malformed dates', async () => {
    const response = await request(server())
      .get(
        '/market-data/historical?symbol=AAPL&startDate=garbage&endDate=2026-02-01',
      )
      .expect(400);

    expect(messageOf(response)).toContain('Dates must be valid');
    expect(historical).not.toHaveBeenCalled();
  });

  it('returns 400 with the validation message for a malformed symbol', async () => {
    const response = await request(server())
      .get(
        '/market-data/historical?symbol=AA%20PL!&startDate=2026-01-01&endDate=2026-02-01',
      )
      .expect(400);

    expect(messageOf(response)).toContain('Invalid symbol format');
    expect(historical).not.toHaveBeenCalled();
  });

  it('passes default interval and bars to the chart use case', async () => {
    chart.mockResolvedValue({
      chartData: {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        interval: 'D',
        pricePoints: [],
      },
    });

    await request(server())
      .get('/market-data/chart?symbol=AAPL&exchange=NASDAQ')
      .expect(200);

    expect(chart).toHaveBeenCalledWith(
      expect.objectContaining({ bars: 200, interval: 'D' }),
    );
  });
});
