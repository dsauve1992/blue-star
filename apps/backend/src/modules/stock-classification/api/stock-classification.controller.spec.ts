import type { Server } from 'http';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DomainErrorFilter } from '../../../common/filters/domain-error.filter';
import { StockClassification } from '../domain/entities/stock-classification.entity';
import { GetOrFetchStockClassificationUseCase } from '../use-cases/get-or-fetch-stock-classification.use-case';
import { StockClassificationController } from './stock-classification.controller';

describe('StockClassificationController', () => {
  let app: INestApplication;
  const classify = jest.fn();
  const server = () => app.getHttpServer() as Server;
  const classification = (industryGroup: string | null) =>
    StockClassification.create({
      ticker: 'AAPL',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      industryKey: 'consumer-electronics',
      industryGroup,
    });

  beforeEach(async () => {
    classify.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [StockClassificationController],
      providers: [
        {
          provide: GetOrFetchStockClassificationUseCase,
          useValue: { execute: classify },
        },
        { provide: APP_FILTER, useClass: DomainErrorFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the industry group of a classified symbol', async () => {
    classify.mockResolvedValue(classification('Technology Hardware'));

    const response = await request(server())
      .get('/stock-classification/AAPL')
      .expect(200);

    expect(response.body).toEqual({
      symbol: 'AAPL',
      industryGroup: 'Technology Hardware',
    });
    expect(classify).toHaveBeenCalledWith('AAPL');
  });

  it('returns a null industry group when the symbol has none', async () => {
    classify.mockResolvedValue(classification(null));

    const response = await request(server())
      .get('/stock-classification/AAPL')
      .expect(200);

    expect(response.body).toEqual({ symbol: 'AAPL', industryGroup: null });
  });

  it('returns a null industry group when the classifier throws', async () => {
    classify.mockRejectedValue(new Error('classifier offline'));

    const response = await request(server())
      .get('/stock-classification/AAPL')
      .expect(200);

    expect(response.body).toEqual({ symbol: 'AAPL', industryGroup: null });
  });

  it('rejects an invalid symbol with 400', async () => {
    await request(server()).get('/stock-classification/%20').expect(400);
    expect(classify).not.toHaveBeenCalled();
  });
});
